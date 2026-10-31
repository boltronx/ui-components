// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

import { colorSchemeScript } from "@boltronx/solid-ui";

// SolidStart streams this document. The color scheme script runs before the page paints, so a
// saved dark mode never flashes light.
export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>solid-ui SolidStart fixture</title>
          {/* Our own script, which escapes anything that could close the tag. */}
          {/* eslint-disable-next-line solid/no-innerhtml */}
          <script innerHTML={colorSchemeScript()} />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
