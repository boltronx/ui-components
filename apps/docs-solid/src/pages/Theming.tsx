import { createSignal, For, onCleanup } from "solid-js";

import {
  Button,
  Card,
  Checkbox,
  Code,
  type ColorSchemeMode,
  Group,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text,
  useColorScheme
} from "@boltronx/solid-ui";

import { Page, Section } from "./Page";

const presets = [
  { name: "Violet", value: "light-dark(#7950f2, #6741d9)" },
  { name: "Red", value: "light-dark(#dc2626, #b61d1d)" },
  { name: "Blue", value: "light-dark(#228be6, #1c7ed6)" },
  { name: "Teal", value: "light-dark(#0ca678, #099268)" },
  { name: "Orange", value: "light-dark(#f76707, #e8590c)" }
];

const radii = [
  { name: "Square", sm: "2px", md: "4px" },
  { name: "Rounded", sm: "6px", md: "8px" },
  { name: "Round", sm: "12px", md: "16px" }
];

const colorTokens = [
  ["--bx-primary", "Buttons, links, checked boxes, focus"],
  ["--bx-danger", "Destructive actions, errors"],
  ["--bx-success", "Success messages"],
  ["--bx-warning", "Warning messages"],
  ["--bx-body", "Page background"],
  ["--bx-surface", "Cards, inputs, menus, modals"],
  ["--bx-text", "Text"],
  ["--bx-border", "Borders"]
] as const;

const derivedTokens = [
  ["--bx-text-dimmed", "Secondary text"],
  ["--bx-surface-hover", "Hovered rows and buttons"],
  ["--bx-primary-light", "Selected items, light buttons"],
  ["--bx-primary-hover", "Hovered primary buttons"]
] as const;

const scaleTokens = [
  "--bx-font-family",
  "--bx-font-size-{xs,sm,md,lg,xl}",
  "--bx-h{1-6}",
  "--bx-spacing-{xs,sm,md,lg,xl}",
  "--bx-radius-{sm,md,lg}",
  "--bx-control-height",
  "--bx-shadow-{sm,md}",
  "--bx-z-{modal,popover,toast,tooltip}"
];

const overrideExample = `/* Your own CSS, outside the library's layer, so it always wins */
:root {
  --bx-primary: light-dark(#dc2626, #b61d1d); /* light, dark */
  --bx-radius-sm: 6px;
  --bx-font-family: "Inter", sans-serif;
}`;

const toggleExample = `import { useColorScheme } from "@boltronx/solid-ui";

const { mode, scheme, setMode } = useColorScheme();
// mode(): "light" | "dark" | "system"   scheme(): "light" | "dark"
setMode(scheme() === "dark" ? "light" : "dark");`;

function TokenSwatches(props: { tokens: readonly (readonly [string, string])[] }) {
  return (
    <SimpleGrid minChildWidth="11rem" gap="sm">
      <For each={props.tokens}>
        {([token, use]) => (
          <Stack gap={4}>
            <div class="docs-swatch" style={{ background: `var(${token})` }} />
            <Code>{token}</Code>
            <Text size="xs" c="dimmed">
              {use}
            </Text>
          </Stack>
        )}
      </For>
    </SimpleGrid>
  );
}

export function Theming() {
  const { mode, setMode } = useColorScheme();
  const [primary, setPrimary] = createSignal(presets[0]!.name);
  const [radius, setRadius] = createSignal(radii[0]!.name);
  const root = document.documentElement.style;

  const applyPrimary = (preset: (typeof presets)[number]) => {
    setPrimary(preset.name);
    root.setProperty("--bx-primary", preset.value);
  };
  const applyRadius = (option: (typeof radii)[number]) => {
    setRadius(option.name);
    root.setProperty("--bx-radius-sm", option.sm);
    root.setProperty("--bx-radius-md", option.md);
  };
  // The playground only changes this page.
  onCleanup(() => {
    for (const token of ["--bx-primary", "--bx-radius-sm", "--bx-radius-md"]) {
      root.removeProperty(token);
    }
  });

  const modes: ColorSchemeMode[] = ["light", "dark", "system"];

  return (
    <Page
      title="Theming"
      lead="Every color, size and radius is a CSS variable. Change one and every component follows."
    >
      <Section title="Try it">
        <Card>
          <Stack gap="md">
            <Stack gap="xs">
              <Text fw={600}>Color scheme</Text>
              <Group gap="xs" wrap>
                <For each={modes}>
                  {option => (
                    <Button
                      variant={mode() === option ? "primary" : "default"}
                      aria-pressed={mode() === option}
                      onClick={() => setMode(option)}
                    >
                      {option[0]!.toUpperCase() + option.slice(1)}
                    </Button>
                  )}
                </For>
              </Group>
            </Stack>
            <Stack gap="xs">
              <Text fw={600}>Primary color</Text>
              <Group gap="xs" wrap>
                <For each={presets}>
                  {preset => (
                    <Button
                      variant={primary() === preset.name ? "light" : "subtle"}
                      aria-pressed={primary() === preset.name}
                      leftSection={
                        <span
                          style={{
                            width: "0.875rem",
                            height: "0.875rem",
                            "border-radius": "50%",
                            background: preset.value
                          }}
                        />
                      }
                      onClick={() => applyPrimary(preset)}
                    >
                      {preset.name}
                    </Button>
                  )}
                </For>
              </Group>
            </Stack>
            <Stack gap="xs">
              <Text fw={600}>Radius</Text>
              <Group gap="xs" wrap>
                <For each={radii}>
                  {option => (
                    <Button
                      variant={radius() === option.name ? "light" : "subtle"}
                      aria-pressed={radius() === option.name}
                      onClick={() => applyRadius(option)}
                    >
                      {option.name}
                    </Button>
                  )}
                </For>
              </Group>
            </Stack>
            <Card shadow="sm">
              <Stack>
                <SimpleGrid minChildWidth="12rem" gap="sm">
                  <Input label="Name" placeholder="Ada Lovelace" />
                  <Select
                    label="Role"
                    placeholder="Pick one"
                    options={[
                      { value: "admin", label: "Admin" },
                      { value: "editor", label: "Editor" }
                    ]}
                  />
                </SimpleGrid>
                <Checkbox label="Send me updates" defaultChecked />
                <Group justify="flex-end" wrap>
                  <Button>Cancel</Button>
                  <Button variant="primary">Save</Button>
                </Group>
              </Stack>
            </Card>
          </Stack>
        </Card>
      </Section>

      <Section title="Override tokens">
        <Text>
          The library's CSS sits in <Code>@layer bx</Code>, so any rule you write outside a layer
          wins over it, with no <Code>!important</Code>. Colors take{" "}
          <Code>light-dark(light, dark)</Code>; pass one color to use it in both schemes.
        </Text>
        <Code block>{overrideExample}</Code>
      </Section>

      <Section title="Base colors">
        <Text>Set these to theme the library. The swatches follow your current scheme.</Text>
        <TokenSwatches tokens={colorTokens} />
      </Section>

      <Section title="Derived colors">
        <Text>
          Computed from the base colors with <Code>color-mix()</Code>, so they follow along. Set one
          directly to fine-tune it.
        </Text>
        <TokenSwatches tokens={derivedTokens} />
      </Section>

      <Section title="Scales">
        <Text>Shared by both schemes.</Text>
        <Group gap="xs" wrap>
          <For each={scaleTokens}>{token => <Code>{token}</Code>}</For>
        </Group>
      </Section>

      <Section title="Light and dark mode">
        <Text>
          By default the page follows the OS setting. <Code>useColorScheme()</Code> lets users pick,
          remembers the choice, and keeps every open tab in sync. It sets{" "}
          <Code>data-theme="light|dark"</Code> on <Code>&lt;html&gt;</Code>, which you can also use
          in your own CSS.
        </Text>
        <Code block>{toggleExample}</Code>
      </Section>
    </Page>
  );
}
