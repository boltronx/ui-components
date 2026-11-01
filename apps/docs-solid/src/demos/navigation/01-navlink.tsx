export const meta = {
  title: "Navlink",
  description: "Pass component={A} to use your router's links. Children make a collapsible group."
};

import { createSignal, type JSX } from "solid-js";

import { Navlink, Stack } from "@boltronx/solid-ui";
import { IconChartBar, IconFolder, IconHome, IconSettings } from "@tabler/icons-solidjs";

export default function Demo() {
  const [active, setActive] = createSignal("home");
  const link = (id: string, label: string, icon?: JSX.Element) => (
    <Navlink
      label={label}
      leftSection={icon}
      active={active() === id}
      onClick={() => setActive(id)}
    />
  );

  return (
    <Stack gap={2} style={{ "max-width": "16rem" }}>
      {link("home", "Home", <IconHome />)}
      {link("reports", "Reports", <IconChartBar />)}
      <Navlink label="Projects" leftSection={<IconFolder />}>
        {link("active", "Active")}
        {link("archived", "Archived")}
      </Navlink>
      <Navlink label="Settings" leftSection={<IconSettings />} disabled />
    </Stack>
  );
}
