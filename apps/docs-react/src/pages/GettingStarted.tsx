import { Anchor, Card, Code, SimpleGrid, Stack, Text, Title } from "@boltronx/react-ui";

import { componentSections } from "../registry";
import { RouterLink } from "../RouterLink";

import { Page, Section } from "./Page";

const setupStyles = `import "@boltronx/react-ui/styles.css";`;

const setupNext = `// app/layout.tsx — a Server Component
import "@boltronx/react-ui/styles.css";
import { ColorSchemeScript } from "@boltronx/react-ui";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The script sets data-theme on <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}`;

const setupVite = `// vite.config.ts
import { colorScheme } from "@boltronx/react-ui/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [react(), colorScheme()] });`;

const setupModalHost = `import { ModalHost } from "@boltronx/react-ui";

// In your root layout, inside your providers (router, theme, ...)
<ModalHost />`;

const firstForm = `import { Button, Input, Stack } from "@boltronx/react-ui";

export function Login() {
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
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

const serverActionForm = `// app/signup/page.tsx — a Server Component, no "use client" needed
import { Button, Input, Select, Stack } from "@boltronx/react-ui";

async function signUp(formData: FormData) {
  "use server";
  await db.users.create({ email: formData.get("email"), plan: formData.get("plan") });
}

export default function SignUp() {
  return (
    <form action={signUp}>
      <Stack>
        <Input label="Email" name="email" type="email" required />
        <Select
          label="Plan"
          name="plan"
          defaultValue="free"
          options={[{ value: "free", label: "Free" }, { value: "pro", label: "Pro" }]}
        />
        <Button type="submit" variant="primary">Create account</Button>
      </Stack>
    </form>
  );
}`;

export function GettingStarted() {
  return (
    <Page
      title="React UI"
      lead="Simple, themeable React components that work with plain HTML forms, Server Components and SSR."
    >
      <Section title="Install">
        <Code block>npm install @boltronx/react-ui</Code>
        <Text c="dimmed">
          Requires <Code>react</Code> and <Code>react-dom</Code> 19 or later. For icons, add{" "}
          <Code>@tabler/icons-react</Code> or any library that renders an <Code>svg</Code>.
        </Text>
      </Section>

      <Section title="1. Import the styles">
        <Text>Once, in your entry file or root layout:</Text>
        <Code block>{setupStyles}</Code>
        <Text>
          <Code>styles.css</Code> also sets page defaults: the body font and background, and{" "}
          <Code>box-sizing</Code>. If your app has its own, import{" "}
          <Code>@boltronx/react-ui/components.css</Code> instead.
        </Text>
      </Section>

      <Section title="2. Avoid a flash of the wrong color scheme">
        <Text>
          Optional. A small script in <Code>&lt;head&gt;</Code> applies the user&apos;s saved light
          or dark choice before the page paints. With Next.js, render <Code>ColorSchemeScript</Code>{" "}
          in the root layout:
        </Text>
        <Code block>{setupNext}</Code>
        <Text>With Vite, add the plugin instead:</Text>
        <Code block>{setupVite}</Code>
      </Section>

      <Section title="3. Let modals see your app">
        <Text>
          Optional. Modals render at the end of <Code>&lt;body&gt;</Code>; with a host inside your
          providers, modal content can use them, such as your router or a theme context. It is a
          client component, so a Next.js root layout can render it directly.
        </Text>
        <Code block>{setupModalHost}</Code>
      </Section>

      <Section title="4. Build a form">
        <Text>
          Inputs submit through <Code>FormData</Code>, so there is no form state to manage.{" "}
          <Anchor component={RouterLink} href="/forms">
            Read the forms guide
          </Anchor>
          .
        </Text>
        <Code block>{firstForm}</Code>
      </Section>

      <Section title="Next.js, Server Components and SSR">
        <Text>
          Import from <Code>@boltronx/react-ui</Code> in Server and Client Components alike. Layout,
          typography and feedback components (<Code>Stack</Code>, <Code>Group</Code>,{" "}
          <Code>SimpleGrid</Code>, <Code>Card</Code>, <Code>Title</Code>, <Code>Text</Code>,{" "}
          <Code>Anchor</Code>, <Code>Code</Code>, <Code>Button</Code>, <Code>Loader</Code>,{" "}
          <Code>Progress</Code>, <Code>Skeleton</Code>, <Code>Avatar</Code>, <Code>Indicator</Code>)
          render on the server and send no JavaScript. The rest are client components: they render
          to HTML on the server too, with their values filled in, and hydrate in the browser.
        </Text>
        <Text>
          Because every input submits through <Code>FormData</Code>, a Server Component can render a
          whole form and post it to a server action:
        </Text>
        <Code block>{serverActionForm}</Code>
        <Text>
          Props passed from a Server Component to a client component must be serializable, so
          components that take functions (<Code>Table</Code>&apos;s <Code>render</Code>,{" "}
          <Code>onChange</Code> handlers, <Code>modal.open</Code>, <Code>message</Code>) go in a
          component of your own marked <Code>&quot;use client&quot;</Code>.
        </Text>
      </Section>

      <Section title="Components">
        <SimpleGrid minChildWidth="14rem" gap="sm">
          {componentSections.map(section => (
            <Card key={section.slug}>
              <Stack gap="xs">
                <Title order={3} size={5}>
                  <Anchor component={RouterLink} href={`/components/${section.slug}`}>
                    {section.title}
                  </Anchor>
                </Title>
                <Text size="sm" c="dimmed">
                  {section.description}
                </Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Section>
    </Page>
  );
}
