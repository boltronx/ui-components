// Checks the fixture's production build by calling its server handler the way a host would:
// the page renders on the server with the library's components filled in, and its form posts to
// a server action that works without JavaScript.
//   pnpm --filter start-fixture build && pnpm --filter start-fixture test
import { existsSync } from "node:fs";

const entry = new URL("../dist/server/entry-server.js", import.meta.url);
if (!existsSync(entry)) {
  console.error("No server build; run `vite build` first.");
  process.exit(1);
}
const { default: handler } = await import(entry.href);
const origin = "http://localhost";

let failed = false;
function check(name, ok) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failed = true;
}

// 1. The page, rendered (and streamed) on the server.
const page = await handler.fetch(new Request(`${origin}/`));
const html = await page.text();
check("the page renders", page.status === 200);
check(
  "the server-only title",
  /<h1[^>]*class="bx-Title[^"]*"[^>]*>Server-rendered page<\/h1>/.test(html)
);
check("hydration keys, so the browser takes over this HTML", /data-hk="/.test(html));
check("the stylesheet in <head>", /<head>.*<link[^>]*rel="stylesheet"[^>]*>.*<\/head>/s.test(html));
check("the color scheme script in <head>", /<head>.*bx-color-scheme.*<\/head>/s.test(html));
check("an Input with its default value", /<input[^>]*value="Ada"/.test(html));
check("InputNumber's grouped display", /value="1,234.50"/.test(html));
check("Select's submitted value", /name="country"[^>]*value="ph"/.test(html));
check("DatePicker's formatted date", /value="Oct 5, 2026"/.test(html));
check("a Textarea's default text", /<textarea[^>]*>Hello<\/textarea>/.test(html));
check("a Switch with its role", /role="switch"/.test(html));
check(
  "Flex's responsive direction",
  /<div[^>]*class="bx-Flex responsive-row[^>]*>/.exec(html)?.[0].includes('data-direction-md=""') ??
    false
);
check('no field locked by readonly="false"', !/\sreadonly="false"/i.test(html));
check("the default color scheme in a component", /Theme: (<!--[^>]*-->)?light/.test(html));

// 2. The form, posted without JavaScript: the action redirects back to the page, which renders
// the result it was handed.
const formAction = /<form[^>]*action="([^"]+)"/.exec(html)?.[1]?.replaceAll("&amp;", "&");
check("the form posts to a server action", formAction?.startsWith("/_server") ?? false);
if (formAction) {
  const form = new FormData();
  form.set("name", "Grace");
  form.set("country", "jp");
  form.set("notifications", "on");
  const posted = await handler.fetch(
    new Request(new URL(formAction, origin), {
      method: "POST",
      body: form,
      headers: { referer: `${origin}/` }
    })
  );
  const location = posted.headers.get("location");
  check(
    "the action redirects back to the page",
    posted.status >= 300 && posted.status < 400 && !!location
  );
  const cookie = posted.headers
    .getSetCookie()
    .map(header => header.split(";")[0])
    .join("; ");
  const after = await handler.fetch(
    new Request(new URL(location ?? "/", origin), { headers: { cookie } })
  );
  const result = await after.text();
  check(
    "the page shows what the action received",
    /name = Grace/.test(result) && /country = jp/.test(result)
  );
}

if (failed) process.exit(1);
