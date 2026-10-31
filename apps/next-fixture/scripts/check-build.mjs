// Checks the HTML `next build` prerendered for the fixture page: Server Components and the
// server render of the client components both made it into the page, with their form values.
//   pnpm --filter next-fixture build && pnpm --filter next-fixture test
import { existsSync, readFileSync } from "node:fs";

const page = new URL("../.next/server/app/index.html", import.meta.url);
if (!existsSync(page)) {
  console.error("No prerendered page; run `next build` first.");
  process.exit(1);
}
const html = readFileSync(page, "utf8");

const expectations = [
  ["the server-only title", /<h1[^>]*class="bx-Title"[^>]*>Server-rendered page<\/h1>/],
  ["a server component's styles", /class="bx-Stack"/],
  [
    "Flex's responsive direction, server-rendered",
    /class="bx-Flex responsive-row"[^>]*data-direction-md=""|data-direction-md=""[^>]*class="bx-Flex responsive-row"/
  ],
  ["a Switch with its role", /role="switch"/],
  ["the color scheme script in <head>", /<head>.*bx-color-scheme.*<\/head>/s],
  ["an Input with its default value", /<input[^>]*value="Ada"/],
  ["InputNumber's grouped display", /value="1,234.50"/],
  ["Select's submitted value", /type="hidden" name="country" value="ph"/],
  ["DatePicker's formatted date", /value="Oct 5, 2026"/],
  ["a client component wrapping Table", /aria-label="Orders"/],
  ["the default color scheme in a client component", /Theme: <!-- -->light/]
];

const failed = expectations.filter(([, pattern]) => !pattern.test(html));
for (const [name] of expectations) {
  console.log(`${failed.some(([n]) => n === name) ? "✗" : "✓"} ${name}`);
}
if (failed.length > 0) process.exit(1);
