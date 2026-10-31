// Tests that read the built package (tree shaking, Server Component boundaries) run only against a
// build of the current source: an older one would test old code, failing for problems already
// fixed or, worse, passing for ones that aren't.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const dist = fileURLToPath(new URL("../dist", import.meta.url));
const source = fileURLToPath(new URL("../src", import.meta.url));

/** The newest modification time of any built source file under `dir` (not tests), in ms. */
function newestModified(dir: string): number {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(item => item.isFile() && !/\.test\.tsx?$/.test(item.name))
    .reduce(
      (newest, item) => Math.max(newest, statSync(join(item.parentPath, item.name)).mtimeMs),
      0
    );
}

/**
 * Whether dist holds a build of the current source, for `describe.skipIf(!hasCurrentBuild(...))`.
 * Without a build the tests are skipped; with an older one they are skipped with a warning, and
 * fail in CI, which builds right before testing.
 */
export function hasCurrentBuild(name: string): boolean {
  const entry = join(dist, "index.js");
  if (!existsSync(entry)) return false;
  if (statSync(entry).mtimeMs >= newestModified(source)) return true;
  const message = `${name}: dist is older than src; run \`pnpm build\` to test the current code.`;
  if (process.env.CI) throw new Error(message);
  console.warn(message);
  return false;
}
