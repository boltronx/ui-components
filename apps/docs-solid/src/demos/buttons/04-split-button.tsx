export const meta = {
  title: "SplitButton",
  description: "A main action plus related ones in a menu."
};

import { MenuDivider, MenuItem, message, SplitButton } from "@boltronx/solid-ui";

export default function Demo() {
  return (
    <SplitButton
      variant="primary"
      onClick={() => message.success("Saved")}
      dropdown={
        <>
          <MenuItem onClick={() => message.info("Saved as draft")}>Save as draft</MenuItem>
          <MenuItem onClick={() => message.info("Saved a copy")}>Save a copy</MenuItem>
          <MenuDivider />
          <MenuItem danger onClick={() => message.error("Discarded")}>
            Discard
          </MenuItem>
        </>
      }
    >
      Save
    </SplitButton>
  );
}
