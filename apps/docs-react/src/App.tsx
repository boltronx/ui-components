import { type ReactNode, useEffect, useState } from "react";
import { HashRouter, Link, Outlet, Route, Routes, useLocation } from "react-router";

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
} from "@boltronx/react-ui";
import { IconDeviceDesktop, IconMenu2, IconMoon, IconSun, IconX } from "@tabler/icons-react";

import { ComponentPage } from "./pages/ComponentPage";
import { Forms } from "./pages/Forms";
import { GettingStarted } from "./pages/GettingStarted";
import { NotFound } from "./pages/NotFound";
import { Theming } from "./pages/Theming";
import { componentSections } from "./registry";
import { RouterLink } from "./RouterLink";

const REPO_URL = "https://github.com/boltronx/ui-components";

const guides = [
  { href: "/", label: "Getting started" },
  { href: "/forms", label: "Forms" },
  { href: "/theming", label: "Theming" }
];

const schemeIcons: Record<ColorSchemeMode, () => ReactNode> = {
  light: () => <IconSun />,
  dark: () => <IconMoon />,
  system: () => <IconDeviceDesktop />
};

const schemeOptions: { mode: ColorSchemeMode; label: string }[] = [
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
  { mode: "system", label: "System" }
];

function ColorSchemeMenu() {
  const { mode, setMode } = useColorScheme();
  return (
    <Menu position="bottom-end">
      <MenuTarget>
        <IconButton aria-label={`Color scheme: ${mode}`} aria-haspopup="menu">
          {schemeIcons[mode]()}
        </IconButton>
      </MenuTarget>
      <MenuDropdown>
        {schemeOptions.map(option => (
          <MenuItem
            key={option.mode}
            selected={mode === option.mode}
            leftSection={schemeIcons[option.mode]()}
            onClick={() => setMode(option.mode)}
          >
            {option.label}
          </MenuItem>
        ))}
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
      key={href}
      component={RouterLink}
      href={href}
      label={label}
      active={location.pathname === href}
      onClick={() => props.onNavigate()}
    />
  );

  return (
    <nav aria-label="Documentation">
      <Stack gap={2}>
        <Text component="h2" size="xs" fw={700} c="dimmed" className="docs-nav-heading">
          Guides
        </Text>
        {guides.map(guide => link(guide.href, guide.label))}
        <Text component="h2" size="xs" fw={700} c="dimmed" className="docs-nav-heading">
          Components
        </Text>
        {componentSections.map(section => link(`/components/${section.slug}`, section.title))}
      </Stack>
    </nav>
  );
}

function Shell() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // A new page starts at the top, like a regular page load.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="docs-shell" data-nav-open={navOpen ? "" : undefined}>
      <header className="docs-header">
        <IconButton
          className="docs-burger"
          aria-label={navOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={navOpen}
          aria-controls="docs-sidebar"
          onClick={() => setNavOpen(open => !open)}
        >
          {navOpen ? <IconX /> : <IconMenu2 />}
        </IconButton>
        <Link to="/" className="docs-brand">
          <span className="docs-logo" aria-hidden="true" />
          React UI
        </Link>
        <span className="docs-spacer" />
        <ColorSchemeMenu />
        <a className="bx-IconButton" href={REPO_URL} aria-label="GitHub repository">
          <GitHubIcon />
        </a>
      </header>
      <div className="docs-overlay" onClick={() => setNavOpen(false)} />
      <aside id="docs-sidebar" className="docs-sidebar">
        <ScrollArea
          className="docs-sidebar-scroll"
          viewportClassName="docs-sidebar-viewport"
          overscrollBehavior="contain"
        >
          <Navigation onNavigate={() => setNavOpen(false)} />
        </ScrollArea>
      </aside>
      <main className="docs-main">
        <Outlet />
      </main>
      {/* Inside the router, so modal content can navigate. */}
      <ModalHost />
    </div>
  );
}

export function App() {
  return (
    // Hash URLs, because GitHub Pages serves one index.html and knows nothing of the routes.
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<GettingStarted />} />
          <Route path="/forms" element={<Forms />} />
          <Route path="/theming" element={<Theming />} />
          <Route path="/components/:slug" element={<ComponentPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
