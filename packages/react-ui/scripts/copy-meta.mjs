// npm only publishes the LICENSE found next to package.json, so `prepack` copies the repo-level
// one in. The copy is gitignored; the file at the repo root is the source.
import { copyFileSync } from "node:fs";

copyFileSync(new URL("../../../LICENSE", import.meta.url), new URL("../LICENSE", import.meta.url));
