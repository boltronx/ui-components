import type { Component } from "solid-js";

interface DemoModule {
  default: Component;
  meta: { title: string; description?: string };
}

export interface Demo {
  id: string;
  title: string;
  description?: string;
  component: Component;
  source: string;
}

export interface Section {
  slug: string;
  title: string;
  description: string;
}

// Each demo is a file under demos/<section>/. Its source is shown next to it, so the code a reader
// copies is exactly the code that runs.
const modules = import.meta.glob<DemoModule>("./demos/*/*.tsx", { eager: true });
const sources = import.meta.glob<string>("./demos/*/*.tsx", {
  eager: true,
  query: "?raw",
  import: "default"
});

/** The source as shown: without the `meta` export, which only feeds this page. */
function cleanSource(source: string): string {
  return source.replace(/^export const meta = \{[\s\S]*?\};\n/m, "").trim();
}

export function demosFor(slug: string): Demo[] {
  const prefix = `./demos/${slug}/`;
  return Object.keys(modules)
    .filter(path => path.startsWith(prefix))
    .sort()
    .map(path => ({
      id: path.slice(prefix.length, -".tsx".length),
      title: modules[path]!.meta.title,
      description: modules[path]!.meta.description,
      component: modules[path]!.default,
      source: cleanSource(sources[path] ?? "")
    }));
}

export const componentSections: Section[] = [
  {
    slug: "buttons",
    title: "Buttons",
    description: "Button, IconButton and SplitButton."
  },
  {
    slug: "inputs",
    title: "Text inputs",
    description: "Input, InputPassword, InputSearch, InputNumber and Textarea."
  },
  {
    slug: "selects",
    title: "Select & Autocomplete",
    description: "Pick from a list, or type with suggestions."
  },
  {
    slug: "dates",
    title: "Date picker",
    description: "Pick a day from a calendar; the form receives YYYY-MM-DD."
  },
  {
    slug: "data",
    title: "Table & Pagination",
    description: "Data tables that become stacked cards on narrow screens."
  },
  {
    slug: "checkbox",
    title: "Checkbox & Switch",
    description: "Checkbox for choices, Switch for settings that apply right away."
  },
  {
    slug: "layout",
    title: "Layout",
    description: "Group, Stack, Flex, SimpleGrid and Card."
  },
  {
    slug: "typography",
    title: "Typography",
    description: "Title, Text, Anchor and Code."
  },
  {
    slug: "feedback",
    title: "Feedback",
    description: "Loader, Progress, Skeleton, Avatar, Indicator and message."
  },
  {
    slug: "overlays",
    title: "Menu & Modal",
    description: "Dropdown menus and dialogs."
  },
  {
    slug: "navigation",
    title: "Navigation",
    description: "Navlink and ScrollArea."
  },
  {
    slug: "icons",
    title: "Icons",
    description: "Bring your own icon set, and swap the icons components draw."
  }
];
