# Contributing

Thanks for helping. Bug reports, fixes, docs and new components are all welcome. For anything
larger than a small fix, please open an issue first so we can agree on the approach.

- **Bugs and ideas:** open an issue with the
  [bug report or feature request form](https://github.com/boltronx/ui-components/issues/new/choose).
- **Security issues:** don't open a public issue; see [SECURITY.md](SECURITY.md).
- **Code of conduct:** everyone taking part follows [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Setup

You need Node.js 24.22.2 (see `.nvmrc`) and pnpm 12 (pinned via `devEngines.packageManager` in
`package.json`; pnpm switches to it automatically).

```sh
pnpm install
pnpm dev:react  # builds react-ui in watch mode and serves its docs at http://localhost:5173
pnpm dev:solid  # the same for solid-ui
pnpm dev:next   # react-ui with the Next.js fixture (SSR and Server Components) at http://localhost:3000
pnpm dev:start  # solid-ui with the SolidStart fixture (SSR and server actions) at http://localhost:3000
```

Add `--open` to any of them to open the browser, e.g. `pnpm dev:solid --open`.

## Project layout

```
packages/react-ui/            @boltronx/react-ui
packages/solid-ui/            @boltronx/solid-ui
  src/components/<Name>/      one folder per component: <Name>.tsx, with optional <Name>.css and <Name>.test.tsx
  src/styles/                 tokens.css (theme variables), base.css, global.css
  scripts/build-css.mjs       combines the CSS files into dist/styles.css and dist/components.css
  test/ssr.test.tsx           renders everything as a server would, with no DOM
  test/hydration.test.tsx     hydrates that HTML and fails on any mismatch
  test/css.test.ts            checks the CSS conventions below
packages/react-ui/test/rsc.test.ts
                              checks which built modules are client and which are server components
packages/solid-ui/test/handler-props.test.tsx
                              checks that props read in event handlers don't leak computations
apps/docs-react/, apps/docs-solid/ the documentation sites, served at /react/ and /solid/
  src/demos/<section>/        each demo is a file; the docs show its source next to it
apps/landing/                 the site's root page (GitHub Pages)
apps/next-fixture/            a Next.js App Router app built and checked by `pnpm test:fixtures`
apps/start-fixture/           a SolidStart app built and checked by `pnpm test:fixtures`
```

Both packages have the same components and share their CSS, so a change to one usually belongs in
the other too.

## Conventions

- **Tests.** New functionality and bug fixes come with automated tests in the same pull request:
  a component's behavior in its `<Name>.test.tsx`, and a fix with a test that fails without it.
  Changes to one package's component usually need the same test in the other.
- **Styles.** A component's CSS lives next to it and only targets its own `bx-<Name>` classes.
  Variants and states are `data-*` attributes (`data-variant="primary"`), not extra classes. Use
  tokens from `tokens.css`, never literal colors; if a value is missing, add a token. The tests in
  `test/css.test.ts` enforce these rules.
- **Forms.** An input works uncontrolled (`defaultValue`, restored by `form.reset()`) and
  controlled (`value` + `onChange`), and submits through `FormData` under its `name`. Add a test
  for both when you add an input.
- **Accessibility.** Label every control, keep keyboard support, and prefer native elements.
- **SSR.** Never read `window`, `document` or storage while rendering, only in effects and event
  handlers, and give the first client render the same output as the server's. The SSR and
  hydration tests catch both.
- **React Server Components.** A react-ui component with no state, effects or context stays a
  plain module, so it renders as a Server Component. Anything using hooks, context or `react-dom`
  starts with `"use client"`; `test/rsc.test.ts` fails when one is missing.
- **Solid props in handlers.** A prop read in an event handler, timer or listener goes through a
  memo made with the component, so a prop written as a condition doesn't leak a computation;
  `test/handler-props.test.tsx` catches this.

## Before you open a pull request

```sh
pnpm check      # format, spelling, lint, build, typecheck, tests, fixtures, package checks
```

CI runs the same checks on every pull request. `pnpm format` and `pnpm lint:fix` fix most issues
automatically. The pull request template lists what reviewers look for.

## Releasing (maintainers)

Releases publish to npm with
[provenance](https://docs.npmjs.com/generating-provenance-statements), through npm trusted
publishing, so no npm token is stored anywhere. Each package is released on its own, with tags
and GitHub releases named `react-ui@vX.Y.Z` and `solid-ui@vX.Y.Z`.

**Automatic:** change `version` in `packages/<name>/package.json` in a pull request and merge it.
The Release workflow publishes every package whose version isn't on npm yet, tags it and creates
a GitHub release with generated notes, grouped by pull request label (see `.github/release.yml`).

**Manual:** Actions → Release → Run workflow. Pick the package and enter a bump (`patch`,
`minor`, `major`, `prerelease`, ...) or an exact version, or leave it empty to publish the
version already in `package.json`. Prereleases go to the `next` dist-tag unless you pick another.

If a release fails after the version commit is pushed, rerun it with an empty version input to publish the existing version; rerunning the same bump would increment the version again.

### One-time setup

1. **First publish by hand**, since trusted publishing can only be configured on a package that
   exists: `pnpm --filter @boltronx/<name> build`, then `npm publish --access public` from
   `packages/<name>`.
2. **On npmjs.com**, open each package → Settings → Trusted publishing → GitHub Actions, and enter
   the `boltronx` organization, the `ui-components` repository, the workflow file `release.yml`
   and the environment `npm`.
3. **On GitHub**, create the `npm` environment (Settings → Environments). Add yourself as a
   required reviewer to approve each release, and limit it to the `main` branch.
4. **Manual bumps push a commit to `main`.** If `main` has a ruleset that blocks direct pushes,
   either add GitHub Actions to its bypass list, or release by pull request (the automatic path).
5. **GitHub Pages**: Settings → Pages → Source: GitHub Actions.
6. **Run history**: the Clean up workflow deletes completed runs older than 7 days every night,
   except Release runs, which npm provenance links to. To also expire their logs and artifacts
   sooner, set Settings → Actions → General → Artifact and log retention.
