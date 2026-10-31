import { useParams } from "react-router";

import { Demo } from "../Demo";
import { componentSections, demosFor } from "../registry";

import { NotFound } from "./NotFound";
import { Page } from "./Page";

export function ComponentPage() {
  const { slug } = useParams<{ slug: string }>();
  const section = componentSections.find(item => item.slug === slug);
  if (!section) return <NotFound />;

  return (
    // Keyed by section, so demo state starts fresh on each component page.
    <Page key={section.slug} title={section.title} lead={section.description}>
      {demosFor(section.slug).map(demo => (
        <Demo key={demo.id} demo={demo} />
      ))}
    </Page>
  );
}
