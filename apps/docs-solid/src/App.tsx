import { createEffect, createSignal, For, type JSX, on } from "solid-js";
import { A, HashRouter, Route, type RouteSectionProps, useLocation } from "@solidjs/router";

import {
  type ColorSchemeMode,
  IconButton,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  ModalHost,
  Navlink,
  ScrollArea,
  Stack,
  Text,
  useColorScheme
} from "@boltronx/solid-ui";
import { IconDeviceDesktop, IconMenu2, IconMoon, IconSun, IconX } from "@tabler/icons-solidjs";

import { ComponentPage } from "./pages/ComponentPage";
import { Forms } from "./pages/Forms";
import { GettingStarted } from "./pages/GettingStarted";
import { NotFound } from "./pages/NotFound";
import { Theming } from "./pages/Theming";
import { componentSections } from "./registry";

const REPO_URL = "https://github.com/boltronx/ui-components";

const guides = [
  { href: "/", label: "Getting started" },
  { href: "/forms", label: "Forms" },
  { href: "/theming", label: "Theming" }
];

const schemeIcons: Record<ColorSchemeMode, () => JSX.Element> = {
  light: () => <IconSun />,
  dark: () => <IconMoon />,
  system: () => <IconDeviceDesktop />
};

function ColorSchemeMenu() {
  const { mode, setMode } = useColorScheme();
  const options: { mode: ColorSchemeMode; label: string }[] = [
    { mode: "light", label: "Light" },
    { mode: "dark", label: "Dark" },
    { mode: "system", label: "System" }
  ];
  return (
    <Menu position="bottom-end">
      <MenuTarget>
        <IconButton aria-label={`Color scheme: ${mode()}`} aria-haspopup="menu">
          {schemeIcons[mode()]()}
        </IconButton>
      </MenuTarget>
      <MenuDropdown>
        <For each={options}>
          {option => (
            <MenuItem
              selected={mode() === option.mode}
              leftSection={schemeIcons[option.mode]()}
              onClick={() => setMode(option.mode)}
            >
              {option.label}
            </MenuItem>
          )}
        </For>
      </MenuDropdown>
    </Menu>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49l-.01-1.7c-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.85.09-.66.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.4 9.4 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9l-.01 2.81c0 .27.18.6.69.49A10.1 10.1 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function Navigation(props: { onNavigate: () => void }) {
  const location = useLocation();
  const link = (href: string, label: string) => (
    <Navlink
      component={A}
      href={href}
      label={label}
      active={location.pathname === href}
      onClick={() => props.onNavigate()}
    />
  );

  return (
    <nav aria-label="Documentation">
      <Stack gap={2}>
        <Text component="h2" size="xs" fw={700} c="dimmed" class="docs-nav-heading">
          Guides
        </Text>
        <For each={guides}>{guide => link(guide.href, guide.label)}</For>
        <Text component="h2" size="xs" fw={700} c="dimmed" class="docs-nav-heading">
          Components
        </Text>
        <For each={componentSections}>
          {section => link(`/components/${section.slug}`, section.title)}
        </For>
      </Stack>
    </nav>
  );
}

function Shell(props: RouteSectionProps) {
  const [navOpen, setNavOpen] = createSignal(false);
  const location = useLocation();

  // A new page starts at the top, like a regular page load.
  createEffect(
    on(
      () => location.pathname,
      () => window.scrollTo(0, 0),
      { defer: true }
    )
  );

  return (
    <div class="docs-shell" data-nav-open={navOpen() ? "" : undefined}>
      <header class="docs-header">
        <IconButton
          class="docs-burger"
          aria-label={navOpen() ? "Close navigation" : "Open navigation"}
          aria-expanded={navOpen()}
          aria-controls="docs-sidebar"
          onClick={() => setNavOpen(open => !open)}
        >
          {navOpen() ? <IconX /> : <IconMenu2 />}
        </IconButton>
        <A href="/" class="docs-brand">
          <span class="docs-logo" aria-hidden="true" />
          Solid UI
        </A>
        <span class="docs-spacer" />
        <ColorSchemeMenu />
        <a class="bx-IconButton" href={REPO_URL} aria-label="GitHub repository">
          <GitHubIcon />
        </a>
      </header>
      <div class="docs-overlay" onClick={() => setNavOpen(false)} />
      <aside id="docs-sidebar" class="docs-sidebar">
        <ScrollArea
          class="docs-sidebar-scroll"
          viewportClass="docs-sidebar-viewport"
          overscrollBehavior="contain"
        >
          <Navigation onNavigate={() => setNavOpen(false)} />
        </ScrollArea>
      </aside>
      <main class="docs-main">{props.children}</main>
      {/* Inside the router, so modal content can navigate. */}
      <ModalHost />
    </div>
  );
}

export function App() {
  return (
    <HashRouter root={Shell}>
      <Route path="/" component={GettingStarted} />
      <Route path="/forms" component={Forms} />
      <Route path="/theming" component={Theming} />
      <Route path="/components/:slug" component={ComponentPage} />
      <Route path="*" component={NotFound} />
    </HashRouter>
  );
}
