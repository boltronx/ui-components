import { For, Show } from "solid-js";
import { useParams } from "@solidjs/router";

import { Demo } from "../Demo";
import { componentSections, demosFor } from "../registry";

import { NotFound } from "./NotFound";
import { Page } from "./Page";

export function ComponentPage() {
  const params = useParams<{ slug: string }>();
  const section = () => componentSections.find(item => item.slug === params.slug);

  return (
    <Show when={section()} fallback={<NotFound />} keyed>
      {current => (
        <Page title={current.title} lead={current.description}>
          <For each={demosFor(current.slug)}>{demo => <Demo demo={demo} />}</For>
        </Page>
      )}
    </Show>
  );
}
