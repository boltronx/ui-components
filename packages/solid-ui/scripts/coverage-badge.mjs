// Turns coverage/coverage-summary.json into a shields.io endpoint badge. The Pages workflow
// publishes it with the docs, so the README badge needs no third-party coverage service.
//   node scripts/coverage-badge.mjs <output.json>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const out = process.argv[2];
if (!out) {
  console.error("Usage: node scripts/coverage-badge.mjs <output.json>");
  process.exit(1);
}

const summary = JSON.parse(
  readFileSync(new URL("../coverage/coverage-summary.json", import.meta.url), "utf8")
);
const pct = summary.total.lines.pct;

// Line coverage, coloured on the usual shields.io scale.
const color =
  pct >= 90
    ? "brightgreen"
    : pct >= 80
      ? "green"
      : pct >= 70
        ? "yellowgreen"
        : pct >= 60
          ? "yellow"
          : "red";

const file = resolve(out);
mkdirSync(dirname(file), { recursive: true });
writeFileSync(
  file,
  JSON.stringify({ schemaVersion: 1, label: "coverage", message: `${pct}%`, color }) + "\n"
);
console.log(`Coverage badge: ${pct}% (${color}) -> ${file}`);
