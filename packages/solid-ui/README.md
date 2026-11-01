<p>
  <img width="100%" src="https://assets.solidjs.com/banner?background=tiles&project=solid-ui" alt="Solid UI">
</p>

# @boltronx/solid-ui

[![CI](https://github.com/boltronx/ui-components/actions/workflows/ci.yml/badge.svg)](https://github.com/boltronx/ui-components/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fboltronx.github.io%2Fui-components%2Fcoverage-solid-ui.json)](https://github.com/boltronx/ui-components/actions/workflows/pages.yml)
[![npm](https://img.shields.io/npm/v/@boltronx/solid-ui)](https://www.npmjs.com/package/@boltronx/solid-ui)
[![Docs](https://github.com/boltronx/ui-components/actions/workflows/pages.yml/badge.svg)](https://boltronx.github.io/ui-components/solid/)
[![Tree-shakeable](https://img.shields.io/badge/tree--shakeable-yes-brightgreen)](https://github.com/boltronx/ui-components/blob/main/packages/solid-ui/test/treeshake.test.ts)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/boltronx/ui-components/badge)](https://scorecard.dev/viewer/?uri=github.com/boltronx/ui-components)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/boltronx/ui-components/blob/main/LICENSE)

Simple, themeable [SolidJS](https://www.solidjs.com/) components that work with plain HTML forms.

**[Documentation and live examples →](https://boltronx.github.io/ui-components/solid/)**

- **Plain forms.** Every input submits through `FormData`, resets with `form.reset()` and validates
  with `required`. There is no form library to learn.
- **Styles that stay out of your way.** Components only style their own `bx-` classes, inside a CSS
  layer, so your CSS always wins without `!important`.
- **Theming with CSS variables.** Change `--bx-primary` and every component follows. Light and dark
  modes come built in.

## Install

```sh
npm install @boltronx/solid-ui
# or: pnpm add @boltronx/solid-ui
```

`solid-js` 1.9 or later is a peer dependency.

The library ships no icon set. Use any library that renders an `<svg>`, such as
[`@tabler/icons-solidjs`](https://tabler.io/icons); buttons, inputs and menus size them to fit.
The few icons the components draw themselves (chevrons, clear buttons, the password eye) can be
swapped with props like `chevronIcon` and `clearIcon`, so they match your set.

## Setup

**1. Import the styles once**, in your entry file:

```ts
import "@boltronx/solid-ui/styles.css";
```

`styles.css` also sets page defaults (body font, background, `box-sizing`). If your app has its own,
import `@boltronx/solid-ui/components.css` instead; it styles the components only.

**2. Avoid a flash of the wrong color scheme** (optional). With Vite, add the plugin:

```ts
// vite.config.ts
import { colorScheme } from "@boltronx/solid-ui/vite";
import solid from "vite-plugin-solid";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [solid(), colorScheme()] });
```

Without Vite, put the output of `colorSchemeScript()` in a `<script>` at the top of `<head>`. The
page follows the OS setting even without it; the script only matters once a user picks a mode.

**3. Use the components:**

```tsx
import { Button, Input, Stack } from "@boltronx/solid-ui";

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
        <Button type="submit" variant="primary">
          Sign in
        </Button>
      </Stack>
    </form>
  );
}
```

## Server-side rendering

The components render on the server with their values filled in, and hydrate without mismatches.
Every build is checked against a SolidStart app, including a form that posts to a server action
with JavaScript off; other SSR setups work the same way. The package ships a server build for the `node`, `deno` and
`worker` conditions, so it works from `node_modules` without compiling it yourself; Solid-aware
bundlers can also compile the JSX build. Dropdowns, tooltips, `modal` and `message` only render
in the browser. `useColorScheme()` renders the default mode on the server and switches to the
saved one after hydration; `colorSchemeScript()` in `<head>` keeps the page from flashing.

## Forms

Each input works as uncontrolled or controlled:

- **Uncontrolled**: pass `defaultValue` (or `defaultChecked`). The browser holds the value, and
  `form.reset()` restores the default.
- **Controlled**: pass `value` (or `checked`) and update it from `onChange`. The value belongs to
  you, so a form reset leaves it alone.

Composite inputs submit like native ones. `Select` adds one entry per picked value
(`formData.getAll("tags")`), and `InputNumber` submits the plain number (`1234.5`) even while it
shows `1,234.50`.

While a form sends, give its submit button `loading`, e.g. from `useSubmission` with a Solid Router
or SolidStart action:

```tsx
import { action, useSubmission } from "@solidjs/router";
import { Button, Input } from "@boltronx/solid-ui";

const subscribe = action(async (formData: FormData) => {
  "use server";
  // save formData.get("email")
}, "subscribe");

export function SubscribeForm() {
  const submission = useSubmission(subscribe);
  return (
    <form action={subscribe} method="post">
      <Input label="Email" name="email" type="email" required />
      <Button type="submit" variant="primary" loading={submission.pending}>
        Subscribe
      </Button>
    </form>
  );
}
```

Without an action, set a signal in `onSubmit` and pass it to `loading` the same way. The form then
can't be sent twice: clicks, Enter and Space on the button do nothing, and neither does Enter in a
field. The button keeps keyboard focus (it is `aria-disabled`, not `disabled`) and its size.

## Theming

Override any token from your own CSS. Colors take `light-dark(light, dark)`:

```css
:root {
  --bx-primary: light-dark(#dc2626, #b61d1d);
  --bx-radius-sm: 4px;
}
```

Switch modes with `useColorScheme()`:

```tsx
const { scheme, setMode } = useColorScheme();
<Button onClick={() => setMode(scheme() === "dark" ? "light" : "dark")}>Toggle</Button>;
```

The [theming guide](https://boltronx.github.io/ui-components/solid/#/theming) lists every token.

## Browser support

The styles use `light-dark()`, CSS nesting and `color-mix()`, so they need Chrome/Edge 123, Firefox
120 or Safari 17.5 and later.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). To report a security issue, see [SECURITY.md](SECURITY.md).

## License

[MIT](https://github.com/boltronx/ui-components/blob/main/LICENSE)
