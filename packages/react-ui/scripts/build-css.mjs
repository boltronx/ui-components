// Builds the published stylesheets from the per-component CSS files:
//   dist/styles.css      tokens + base + global page styles + components
//   dist/components.css  tokens + base + components, for apps that keep their own page styles
// Everything goes in `@layer bx`, so any unlayered CSS the app writes overrides it.
import { mkdirSync, readdirSync, readFileSync, watch, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { browserslistToTargets, transform } from "lightningcss";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");

// light-dark() is the newest feature the styles depend on, so its support sets the floor.
const targets = browserslistToTargets(["chrome >= 123", "firefox >= 120", "safari >= 17.5"]);

/** Component stylesheets in a stable order, so builds are reproducible. */
export function componentFiles() {
  const dir = join(src, "components");
  return readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
    .flatMap(name =>
      readdirSync(join(dir, name))
        .filter(file => file.endsWith(".css"))
        .sort()
        .map(file => join(dir, name, file))
    );
}

function concat(files) {
  return files
    .map(
      file => `/* ${relative(src, file).replaceAll("\\", "/")} */\n${readFileSync(file, "utf8")}`
    )
    .join("\n");
}

export function buildCss({ includeGlobal }) {
  const styles = join(src, "styles");
  const files = [
    join(styles, "tokens.css"),
    join(styles, "base.css"),
    ...(includeGlobal ? [join(styles, "global.css")] : []),
    ...componentFiles()
  ];
  const source = `@layer bx {\n${concat(files)}\n}\n`;
  const { code, warnings } = transform({
    filename: includeGlobal ? "styles.css" : "components.css",
    code: Buffer.from(source),
    minify: true,
    targets
  });
  for (const warning of warnings) console.warn(`[css] ${warning.message}`);
  return code.toString();
}

function build() {
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, "styles.css"), buildCss({ includeGlobal: true }));
  writeFileSync(join(dist, "components.css"), buildCss({ includeGlobal: false }));
  console.log("[css] dist/styles.css and dist/components.css written");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  build();
  if (process.argv.includes("--watch")) {
    let timer;
    watch(src, { recursive: true }, (_event, file) => {
      if (!file?.endsWith(".css")) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          build();
        } catch (error) {
          console.error(`[css] ${error.message}`);
        }
      }, 50);
    });
    console.log("[css] watching src/**/*.css");
  }
}
