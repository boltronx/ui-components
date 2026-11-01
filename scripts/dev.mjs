// Runs a library's watchers beside an app's dev server, for the root dev:* scripts. Arguments
// after the two names go to the app only, so `pnpm dev:solid --open` opens the docs: pnpm would
// give them to every dev script, and the library's tsup rejects options it doesn't know.
//
//   node scripts/dev.mjs @boltronx/solid-ui docs-solid [app arguments...]
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

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

// Vite opens the browser itself with --open, but `next dev` has no such option: for Next the flag
// is taken out here, and the browser opened once the server answers.
const appPackage = JSON.parse(
  readFileSync(new URL(`../apps/${app}/package.json`, import.meta.url))
);
const opensHere = appArgs.includes("--open") && /^next\b/.test(appPackage.scripts?.dev ?? "");
const devArgs = opensHere ? appArgs.filter(arg => arg !== "--open") : appArgs;

// The app imports the library's dist, so it is built once before the watchers start.
const build = spawnSync(...pnpm(["--filter", library, "build"]));
if (build.status !== 0) process.exit(build.status ?? 1);

const children = [
  spawn(...pnpm(["--filter", library, "dev"])),
  spawn(...pnpm(["--filter", app, "dev", ...devArgs]))
];

/** The port `next dev` listens on: its -p/--port argument, PORT, or 3000. */
function nextPort(args) {
  const index = args.findIndex(arg => arg === "-p" || arg === "--port");
  const inline = args.find(arg => arg.startsWith("--port="));
  return (index >= 0 ? args[index + 1] : inline?.slice(7)) ?? process.env.PORT ?? "3000";
}

/** Opens `url` in the default browser once the server answers, as Vite's --open does. */
async function openWhenReady(url) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (children[1].exitCode !== null) return;
    try {
      await fetch(url);
      break;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  console.log(`[dev] opening ${url}`);
  // BROWSER=none skips it, as it does for Vite.
  if (process.env.BROWSER === "none") return;
  const [command, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : [process.platform === "darwin" ? "open" : "xdg-open", [url]];
  spawn(command, args, { stdio: "ignore", detached: true }).unref();
}

if (opensHere) void openWhenReady(`http://localhost:${nextPort(devArgs)}`);

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
