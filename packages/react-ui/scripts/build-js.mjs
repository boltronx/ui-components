// Builds dist/ as one ES module per source module, the layout React Server Components need:
// a bundler only treats a module as client code when the file itself starts with "use client",
// so merging modules into one file would make every component a client component (or none).
//   node scripts/build-js.mjs [--watch]
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build, context } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");

/** Every module under src/, tests left out. */
function sourceFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith(".d.ts")
      ? [path]
      : [];
  });
}

/** The built path of a relative import: "./icons" -> "./icons/index.js", "./style" -> "./style.js". */
function builtSpecifier(specifier, importer) {
  const target = resolve(dirname(importer), specifier);
  for (const ext of [".ts", ".tsx"]) {
    if (existsSync(target + ext)) return `${specifier}.js`;
  }
  for (const ext of [".ts", ".tsx"]) {
    if (existsSync(join(target, `index${ext}`))) return `${specifier}/index.js`;
  }
  throw new Error(`Cannot resolve ${specifier} from ${relative(root, importer)}`);
}

/** Keeps each relative import as an import of the sibling built file, instead of inlining it. */
const keepModules = {
  name: "keep-modules",
  setup(builder) {
    builder.onResolve({ filter: /^\.\.?\// }, args => {
      if (args.kind === "entry-point") return undefined;
      return { path: builtSpecifier(args.path, args.importer), external: true };
    });
  }
};

const options = {
  entryPoints: sourceFiles(src),
  outdir: join(root, "dist"),
  outbase: src,
  bundle: true,
  packages: "external",
  plugins: [keepModules],
  format: "esm",
  platform: "neutral",
  target: "es2022",
  jsx: "automatic",
  // Keeps the /* @__PURE__ */ marks, so apps can drop components they never import.
  minifySyntax: false,
  logLevel: "warning"
};

if (process.argv.includes("--watch")) {
  await (await context(options)).watch();
  console.log("[js] watching src");
} else {
  await build(options);
  console.log("[js] dist/**/*.js written");
}
