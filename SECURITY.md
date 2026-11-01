# Security policy

## Supported versions

Security fixes go into the latest release. Please upgrade to it before reporting.

## Reporting a vulnerability

Please **don't open a public issue**. Report it privately through
[GitHub's security advisories](https://github.com/boltronx/ui-components/security/advisories/new)
instead.

Include what you found, how to reproduce it, and the impact you expect. You'll get a reply within
a week. Once a fix is released, the advisory is published, with credit to you unless you'd rather
stay anonymous.

## How releases are protected

- Packages are published from GitHub Actions with npm trusted publishing and
  [provenance](https://docs.npmjs.com/generating-provenance-statements), so you can check that a
  version was built from this repository: `npm audit signatures`.
- Every GitHub Action is pinned to a commit SHA, and workflows are audited with
  [zizmor](https://github.com/zizmorcore/zizmor) and CodeQL.
- Dependencies are installed only after they've been public for a few days, which keeps most
  hijacked releases out.
