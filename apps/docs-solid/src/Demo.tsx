import { createSignal, onCleanup, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

import { Button, Card, Code, Group, Stack, Text, Title } from "@boltronx/solid-ui";
import { IconCheck } from "@tabler/icons-solidjs";

import type { Demo as DemoData } from "./registry";

export function Demo(props: { demo: DemoData }) {
  const [showCode, setShowCode] = createSignal(false);
  const [copyState, setCopyState] = createSignal<"idle" | "copied" | "failed">("idle");

  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(resetTimer));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.demo.source);
      setCopyState("copied");
    } catch {
      // Clipboard access can be denied (permissions, an insecure origin); say so rather than
      // leaving the button looking like it worked.
      setCopyState("failed");
    }
    // Restarted by each copy, so a second click keeps its "Copied" for the full time.
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => setCopyState("idle"), 1500);
  };

  return (
    <section id={props.demo.id} class="docs-demo">
      <Stack gap="xs">
        <Title order={3} size={4}>
          {props.demo.title}
        </Title>
        <Show when={props.demo.description}>
          <Text c="dimmed">{props.demo.description}</Text>
        </Show>
      </Stack>
      <Card padding={0} class="docs-demo-card">
        <div class="docs-demo-preview">
          <Dynamic component={props.demo.component} />
        </div>
        <Group justify="flex-end" gap="xs" class="docs-demo-toolbar">
          <Show when={showCode()}>
            <Button
              variant="subtle"
              onClick={copy}
              leftSection={copyState() === "copied" ? <IconCheck /> : null}
            >
              {{ idle: "Copy", copied: "Copied", failed: "Copy failed" }[copyState()]}
            </Button>
          </Show>
          <Button
            variant="subtle"
            aria-expanded={showCode()}
            onClick={() => setShowCode(value => !value)}
          >
            {showCode() ? "Hide code" : "Show code"}
          </Button>
        </Group>
        <Show when={showCode()}>
          <Code block class="docs-demo-code">
            {props.demo.source}
          </Code>
        </Show>
      </Card>
    </section>
  );
}
