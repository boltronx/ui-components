import { For } from "solid-js";
import { A } from "@solidjs/router";

import { Anchor, Card, Code, SimpleGrid, Stack, Text, Title } from "@boltronx/solid-ui";

import { componentSections } from "../registry";

import { Page, Section } from "./Page";

const setupStyles = `import "@boltronx/solid-ui/styles.css";`;

const setupVite = `// vite.config.ts
import { colorScheme } from "@boltronx/solid-ui/vite";
import solid from "vite-plugin-solid";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [solid(), colorScheme()] });`;

const setupModalHost = `import { ModalHost } from "@boltronx/solid-ui";

// In your root layout, inside your providers (router, theme, ...)
<ModalHost />`;

const firstForm = `import { Button, Input, Stack } from "@boltronx/solid-ui";

export function Login() {
  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    console.log(data.get("email"));
  };

  return (
    <form onSubmit={onSubmit}>
      <Stack>
        <Input label="Email" name="email" type="email" required />
        <Button type="submit" variant="primary">Sign in</Button>
      </Stack>
    </form>
  );
}`;

export function GettingStarted() {
  return (
    <Page
      title="Solid UI"
      lead="Simple, themeable SolidJS components that work with plain HTML forms."
    >
      <Section title="Install">
        <Code block>npm install @boltronx/solid-ui</Code>
        <Text c="dimmed">
          Requires <Code>solid-js</Code> 1.9 or later. For icons, add{" "}
          <Code>@tabler/icons-solidjs</Code> or any library that renders an <Code>svg</Code>.
        </Text>
      </Section>

      <Section title="1. Import the styles">
        <Text>Once, in your entry file:</Text>
        <Code block>{setupStyles}</Code>
        <Text>
          <Code>styles.css</Code> also sets page defaults: the body font and background, and{" "}
          <Code>box-sizing</Code>. If your app has its own, import{" "}
          <Code>@boltronx/solid-ui/components.css</Code> instead.
        </Text>
      </Section>

      <Section title="2. Avoid a flash of the wrong color scheme">
        <Text>
          Optional. The plugin adds a small script to <Code>&lt;head&gt;</Code> that applies the
          user's saved light or dark choice before the page paints.
        </Text>
        <Code block>{setupVite}</Code>
      </Section>

      <Section title="3. Let modals see your app">
        <Text>
          Optional. Modals render at the end of <Code>&lt;body&gt;</Code>; with a host inside your
          providers, modal content can use them, such as the router's <Code>useNavigate</Code>.
        </Text>
        <Code block>{setupModalHost}</Code>
      </Section>

      <Section title="4. Build a form">
        <Text>
          Inputs submit through <Code>FormData</Code>, so there is no form state to manage.{" "}
          <Anchor component={A} href="/forms">
            Read the forms guide
          </Anchor>
          .
        </Text>
        <Code block>{firstForm}</Code>
      </Section>

      <Section title="Components">
        <SimpleGrid minChildWidth="14rem" gap="sm">
          <For each={componentSections}>
            {section => (
              <Card>
                <Stack gap="xs">
                  <Title order={3} size={5}>
                    <Anchor component={A} href={`/components/${section.slug}`}>
                      {section.title}
                    </Anchor>
                  </Title>
                  <Text size="sm" c="dimmed">
                    {section.description}
                  </Text>
                </Stack>
              </Card>
            )}
          </For>
        </SimpleGrid>
      </Section>
    </Page>
  );
}
