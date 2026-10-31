export const meta = {
  title: "Textarea",
  description: "autoSize grows with the text, up to maxRows."
};

import { Textarea } from "@boltronx/solid-ui";

export default function Demo() {
  return (
    <Textarea
      label="Notes"
      placeholder="Write a few lines"
      autoSize
      maxRows={6}
      showCount
      maxLength={280}
    />
  );
}
