// Runs a library's watchers beside an app's dev server, for the root dev:* scripts. Arguments
// after the two names go to the app only, so `pnpm dev:solid --open` opens the docs: pnpm would
// give them to every dev script, and the library's tsup rejects options it doesn't know.
//
//   node scripts/dev.mjs @boltronx/solid-ui docs-solid [app arguments...]
import { spawn, spawnSync } from "node:child_process";

const [library, app, ...appArgs] = process.argv.slice(2);
if (!library || !app) {
  console.error("usage: node scripts/dev.mjs <library> <app> [app arguments...]");
  process.exit(1);
}

// The pnpm running this script: a native binary, or a JS file for Node. Called directly, without
// a shell, so arguments reach it as given on every platform.
const pnpmPath = process.env.npm_execpath ?? "pnpm";
const isScript = /\.[cm]?js$/.test(pnpmPath);
const pnpm = args => [
  isScript ? process.execPath : pnpmPath,
  isScript ? [pnpmPath, ...args] : args,
  { stdio: "inherit" }
];

// The app imports the library's dist, so it is built once before the watchers start.
const build = spawnSync(...pnpm(["--filter", library, "build"]));
if (build.status !== 0) process.exit(build.status ?? 1);

const children = [
  spawn(...pnpm(["--filter", library, "dev"])),
  spawn(...pnpm(["--filter", app, "dev", ...appArgs]))
];

/** Stops a child and what it started; on Windows, kill() would leave its own children running. */
function stop(child) {
  if (child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
  } else child.kill();
}

// When one stops (Ctrl+C, or a crash), the other goes too, rather than run on unnoticed.
for (const child of children) {
  child.on("exit", code => {
    process.exitCode ??= code ?? 1;
    for (const other of children) if (other !== child) stop(other);
  });
}
