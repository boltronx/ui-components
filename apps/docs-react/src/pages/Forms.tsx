import { Code, Text } from "@boltronx/react-ui";

import { Demo } from "../Demo";
import { demosFor } from "../registry";

import { Page, Section } from "./Page";

export function Forms() {
  return (
    <Page
      title="Forms"
      lead="Plain HTML forms: read values with FormData, reset with form.reset(), validate with required."
    >
      <Section title="Two ways to hold a value">
        <Text>
          <strong>Uncontrolled</strong>: pass <Code>defaultValue</Code> (or{" "}
          <Code>defaultChecked</Code>). The browser keeps the value, a submit reads it from{" "}
          <Code>FormData</Code>, and <Code>form.reset()</Code> brings the default back. Use this for
          most forms.
        </Text>
        <Text>
          <strong>Controlled</strong>: pass <Code>value</Code> (or <Code>checked</Code>) and update
          it from <Code>onChange</Code>. The value belongs to your code, so a form reset leaves it
          alone. Use this when other parts of the page react to the value as it changes.
        </Text>
        <Text>
          Composite inputs submit like native ones: a multiple <Code>Select</Code> adds one entry
          per value (read them with <Code>formData.getAll()</Code>), and <Code>InputNumber</Code>{" "}
          submits the plain number even while it shows grouped digits.
        </Text>
      </Section>
      <Section title="Submitting">
        <Text>
          Give the submit button <Code>loading</Code> while the form sends, e.g. from{" "}
          <Code>useFormStatus</Code> in a form action or your own state in <Code>onSubmit</Code>.
          While it loads, the form cannot be sent again: clicks, Enter and Space on the button do
          nothing, and neither does Enter in a field: not in a lone field, which Enter would
          otherwise submit on its own, nor in a <Code>Textarea</Code> with{" "}
          <Code>submitOnEnter</Code>.
        </Text>
        <Text>
          The button stays enabled, only marked <Code>aria-disabled</Code> and{" "}
          <Code>aria-busy</Code>, because a disabled button loses focus: a keyboard user who pressed
          it would be dropped at the top of the page. It keeps its size, with a spinner in place of
          its left section, so the layout stays put.
        </Text>
        <Text>
          Button has no hooks, so a Server Component can render it, loading or not. In a server
          action form, put the button that reads <Code>useFormStatus</Code> in a small client
          component, as the demo below does.
        </Text>
      </Section>
      {demosFor("forms").map(demo => (
        <Demo key={demo.id} demo={demo} />
      ))}
    </Page>
  );
}
