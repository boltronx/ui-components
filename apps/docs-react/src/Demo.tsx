import { useState } from "react";

import { Button, Card, Code, Group, Stack, Text, Title } from "@boltronx/react-ui";
import { IconCheck } from "@tabler/icons-react";

import type { Demo as DemoData } from "./registry";

export function Demo(props: { demo: DemoData }) {
  const [showCode, setShowCode] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copied = copyState === "copied";
  const Component = props.demo.component;

  const copy = async () => {
    try {
      // navigator.clipboard is missing outside secure contexts, and writing can be refused.
      await navigator.clipboard.writeText(props.demo.source);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 1500);
  };

  return (
    <section id={props.demo.id} className="docs-demo">
      <Stack gap="xs">
        <Title order={3} size={4}>
          {props.demo.title}
        </Title>
        {props.demo.description ? <Text c="dimmed">{props.demo.description}</Text> : null}
      </Stack>
      <Card padding={0} className="docs-demo-card">
        <div className="docs-demo-preview">
          <Component />
        </div>
        <Group justify="flex-end" gap="xs" className="docs-demo-toolbar">
          {showCode && (
            <Button variant="subtle" onClick={copy} leftSection={copied ? <IconCheck /> : null}>
              {copied ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
            </Button>
          )}
          <Button variant="subtle" aria-expanded={showCode} onClick={() => setShowCode(v => !v)}>
            {showCode ? "Hide code" : "Show code"}
          </Button>
        </Group>
        {showCode && (
          <Code block className="docs-demo-code">
            {props.demo.source}
          </Code>
        )}
      </Card>
    </section>
  );
}
