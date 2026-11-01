export const meta = {
  title: "Navlink",
  description:
    "Pass component={Link} to use your router's links. Children make a collapsible group."
};

import { type ReactNode, useState } from "react";

import { Navlink, Stack } from "@boltronx/react-ui";
import { IconChartBar, IconFolder, IconHome, IconSettings } from "@tabler/icons-react";

export default function Demo() {
  const [active, setActive] = useState("home");
  const link = (id: string, label: string, icon?: ReactNode) => (
    <Navlink
      label={label}
      leftSection={icon}
      active={active === id}
      onClick={() => setActive(id)}
    />
  );

  return (
    <Stack gap={2} style={{ maxWidth: "16rem" }}>
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
