# @boltronx/react-ui

[![CI](https://github.com/boltronx/ui-components/actions/workflows/ci.yml/badge.svg)](https://github.com/boltronx/ui-components/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fboltronx.github.io%2Fui-components%2Fcoverage-react-ui.json)](https://github.com/boltronx/ui-components/actions/workflows/pages.yml)
[![npm](https://img.shields.io/npm/v/@boltronx/react-ui)](https://www.npmjs.com/package/@boltronx/react-ui)
[![Docs](https://github.com/boltronx/ui-components/actions/workflows/pages.yml/badge.svg)](https://boltronx.github.io/ui-components/react/)
[![Tree-shakeable](https://img.shields.io/badge/tree--shakeable-yes-brightgreen)](https://github.com/boltronx/ui-components/blob/main/packages/react-ui/test/treeshake.test.ts)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/boltronx/ui-components/badge)](https://scorecard.dev/viewer/?uri=github.com/boltronx/ui-components)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/16170/badge)](https://www.bestpractices.dev/projects/16170)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/boltronx/ui-components/blob/main/LICENSE)

Simple, themeable [React](https://react.dev/) components that work with plain HTML forms, Server
Components and SSR.

**[Documentation and live examples →](https://boltronx.github.io/ui-components/react/)**

- **Plain forms.** Every input submits through `FormData`, resets with `form.reset()` and validates
  with `required`. There is no form library to learn, and a Server Component can post a whole form
  to a server action.
- **Built for SSR and Server Components.** Every component renders on the server with its values
  filled in and hydrates without mismatches. Layout and typography components stay Server
  Components and send no JavaScript; interactive ones are marked `"use client"` for you.
- **Styles that stay out of your way.** Components only style their own `bx-` classes, inside a CSS
  layer, so your CSS always wins without `!important`.
- **Theming with CSS variables.** Change `--bx-primary` and every component follows. Light and dark
  modes come built in.

## Install

```sh
npm install @boltronx/react-ui
# or: pnpm add @boltronx/react-ui
```

`react` and `react-dom` 19 or later are peer dependencies.

The library ships no icon set. Use any library that renders an `<svg>`, such as
[`@tabler/icons-react`](https://tabler.io/icons); buttons, inputs and menus size them to fit.
The few icons the components draw themselves (chevrons, clear buttons, the password eye) can be
swapped with props like `chevronIcon` and `clearIcon`, so they match your set.

## Setup with Next.js (App Router)

**1. Import the styles and the color scheme script** in the root layout, a Server Component:

```tsx
// app/layout.tsx
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
}
```

`styles.css` also sets page defaults (body font, background, `box-sizing`). If your app has its own,
import `@boltronx/react-ui/components.css` instead; it styles the components only.
`ColorSchemeScript` is optional: without it the page follows the OS setting, and it only matters
once a user picks a mode.

**2. Use the components**, in Server and Client Components alike:

```tsx
// app/signup/page.tsx — a Server Component
import { Button, Input, Stack } from "@boltronx/react-ui";

async function signUp(formData: FormData) {
  "use server";
  console.log(formData.get("email"));
}

export default function SignUp() {
  return (
    <form action={signUp}>
      <Stack>
        <Input label="Email" name="email" type="email" required />
        <Button type="submit" variant="primary">
          Sign up
        </Button>
      </Stack>
    </form>
  );
}
```

Props passed from a Server Component to a client component must be serializable. Components that
take functions (`Table` columns' `render`, `onChange` handlers) and the imperative `modal` and
`message` APIs go in a component of your own marked `"use client"`.

## Setup with Vite

Import `@boltronx/react-ui/styles.css` in your entry file, and add the plugin that inlines the
color scheme script:

```ts
// vite.config.ts
import { colorScheme } from "@boltronx/react-ui/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [react(), colorScheme()] });
```

Elsewhere, put the output of `colorSchemeScript()` in a `<script>` at the top of `<head>`.

## Forms

Each input works as uncontrolled or controlled:

- **Uncontrolled**: pass `defaultValue` (or `defaultChecked`). The browser holds the value, and
  `form.reset()` restores the default.
- **Controlled**: pass `value` (or `checked`) and update it from `onChange`. The value belongs to
  you, so a form reset leaves it alone.

Composite inputs submit like native ones. `Select` adds one entry per picked value
(`formData.getAll("tags")`), and `InputNumber` submits the plain number (`1234.5`) even while it
shows `1,234.50`.

While a form sends, give its submit button `loading`, e.g. from `useFormStatus`:

```tsx
"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@boltronx/react-ui";

export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" loading={pending}>
      Save
    </Button>
  );
}
```

The form then can't be sent twice: clicks, Enter and Space on the button do nothing, and neither
does Enter in a field. The button keeps keyboard focus (it is `aria-disabled`, not `disabled`) and
its size, and Button itself still renders in a Server Component.

## Theming

Override any token from your own CSS. Colors take `light-dark(light, dark)`:

```css
:root {
  --bx-primary: light-dark(#dc2626, #b61d1d);
  --bx-radius-sm: 4px;
}
```

Switch modes with `useColorScheme()`. The server renders the default mode; the saved one takes
over right after hydration:

```tsx
"use client";
const { scheme, setMode } = useColorScheme();
<Button onClick={() => setMode(scheme === "dark" ? "light" : "dark")}>Toggle</Button>;
```

The [theming guide](https://boltronx.github.io/ui-components/react/#/theming) lists every token.

## Browser support

The styles use `light-dark()`, CSS nesting and `color-mix()`, so they need Chrome/Edge 123, Firefox
120 or Safari 17.5 and later.

## Contributing

See [CONTRIBUTING.md](https://github.com/boltronx/ui-components/blob/main/CONTRIBUTING.md). To report a security issue, see [SECURITY.md](https://github.com/boltronx/ui-components/blob/main/SECURITY.md).

## License

[MIT](https://github.com/boltronx/ui-components/blob/main/LICENSE)
