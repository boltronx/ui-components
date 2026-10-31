// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";

// Hydrates the server's HTML.
mount(() => <StartClient />, document.getElementById("app")!);
