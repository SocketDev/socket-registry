# socket-registry architecture

The CLAUDE.md `## 🏗️ Registry-Specific` section is the headline. This file is the full layout, command catalog, build system notes, testing conventions, and dependency policy.

## Layout

- `/registry/src/` — TypeScript source.
- `/registry/dist/` — esbuild output (CommonJS).
- `/scripts/` — dev / build / release scripts (`.mts`).
- `/test/` — test files + fixtures.
- `/packages/npm/` — NPM package overrides shipped by the registry.
- Primary export: `getManifestData(ecosystem, packageName)` from `@socketsecurity/registry`.

## Commands

| Command                                  | Purpose                                                     |
| ---------------------------------------- | ----------------------------------------------------------- |
| `pnpm run build`                         | Build the registry (esbuild → CJS).                         |
| `pnpm test`                              | Run vitest suite.                                           |
| `pnpm run check`                         | Lint + type check together.                                 |
| `pnpm run fix`                           | Auto-fix lint + format.                                     |
| `pnpm run type`                          | Type check only (`tsgo`, no emit).                          |
| `pnpm run update`                        | Refresh dependencies via taze.                              |
| `pnpm run make-npm-override`             | Scaffold a new NPM package override under `/packages/npm/`. |
| `pnpm run release-npm`                   | Publish NPM overrides.                                      |
| `node scripts/npm/test-npm-packages.mts` | Long-running NPM-package test driver.                       |

## Build system

esbuild bundles the registry to CommonJS, **unminified for Node ESM interop**. A post-build transform converts esbuild's wrappers to `module.exports = { ... }` so Node ESM `import { foo } from '@socketsecurity/registry'` works against the CJS output without surprises.

Lint: oxlint. Format: oxfmt. No ESLint, no Prettier.

## Node compatibility

Minimum **Node 24.0.0**.

🚨 **Forbidden ES2023+ array methods in shipped code** (`registry/src/`, `packages/npm/` overrides): `toReversed()`, `toSorted()`, `toSpliced()`, `with()`. Use `slice().reverse()` / `slice().sort()` instead. The `engines` floor is `>=24`, but npm only warns on an engine mismatch, so overrides still get installed on consumers' older Node where these throw. Dev scripts run on the repo's own Node and are exempt; `socket/no-runtime-features-below-engine-floor` enforces this per file from each `engines` floor.

## GitHub Actions SHA pin cascade

The cascade procedure is documented in detail at [`.claude/skills/updating-workflows/reference.md`](../../../.claude/skills/updating-workflows/reference.md) — invoked via the `/update-workflows` slash command.

Quick orientation:

- **Layered topology** — Layer 1 (leaf actions) → Layer 2a (setup) → Layer 2b (setup-and-install) → Layer 3 (reusable workflows) → Layer 4 (`_local-not-for-reuse-*.yml` wrappers). Each layer is its own PR.
- 🚨 **Never type or guess SHAs.** Resolve via `git fetch origin main && git rev-parse origin/main` AFTER each layer's PR merges. The merge SHA is the pin for the next layer.
- **Propagation SHA** = whatever `.github/workflows/_local-not-for-reuse-*.yml` currently pin. Expect exactly one distinct propagation SHA across those files; more means the Layer 4 bump is incomplete.
- **Consumer-repo cadence:**
  - Direct push: socket-btm, socket-sdxgen, socket-stuie, ultrathink.
  - PR required: socket-cli, socket-lib, socket-sdk-js, socket-packageurl-js.
- 🚨 **Never `sed` / `awk` / `perl -i` workflow YAML.** Use the Edit tool. Stream editors clobber quoting on lines the regex didn't expect.

## CI testing

- **Mandatory**: invoke `SocketDev/socket-registry/.github/workflows/ci.yml@<SHA>` with a full 40-char commit SHA.
- Matrix: Node 22 and 24, cross-platform (Linux + macOS + Windows where applicable).
- CI-script naming: `lint-ci`, `test-ci`, `type-ci`. No watch or fix modes in CI.

## Testing

Directory layout:

- `test/npm/` — NPM-package override tests, one subdir per override.
- `test/registry.test.mts` — registry-level tests.
- `test/packages.test.mts` — package-level smoke tests.

Utilities in `test/util/`:

- `setupNpmPackageTest()` — install + link harness for NPM override tests.
- `itOnWindows` / `itOnUnix` — platform-gated test wrappers.
- `normalizePath()` — cross-platform path normalization (use this, not regex with `[/\\]`).
- `expect*` helpers — assertion utilities scoped to registry shape.
- `createTypeCheckerTests()` — generates type-check tests for an NPM override.

Coverage policy:

- **Mandatory; never decrease.** Any drop blocks the PR.
- Every `c8 ignore` comment must carry a reason ending with a period.

🚨 **Never use `--` before test paths** — vitest interprets it as a flag separator and runs ALL tests instead of the specified file.

## Vitest config

`.config/vitest.config.mts` is the canonical config used by `pnpm test`.

Forks for isolation:

```ts
pool: 'forks'
singleFork: true
maxForks: 1
isolate: true
```

Timeouts: `testTimeout: 60_000`, `hookTimeout: 60_000`. NPM-package tests legitimately need the time — `setupNpmPackageTest()` does real installs.

## Dependency alignment

Core stack:

- `@typescript/native-preview` — tsgo. Faster than tsc, drop-in for type checking.
- `@types/node` — Node 24+ types.
- `typescript-eslint` — unified package only.

🚨 **Forbidden**: separate `@typescript-eslint/*` packages. The unified `typescript-eslint` ships both the parser and the rules at synchronized versions; mixing the split packages produces version-skew bugs that are painful to diagnose.

🚨 **tsgo preservation**: never replace `@typescript/native-preview` with stock `tsc`. The fleet runs tsgo for speed; the swap silently regresses CI time by minutes.

Update flow: `pnpm run taze` (third-party scope first, then Socket scopes). Soak entries follow the fleet rule (`# published: YYYY-MM-DD | removable: YYYY-MM-DD`).

## Scratch documents

`.claude/` is gitignored — working notes go there, never commit. Use it for in-progress investigation, plans, agent transcripts, anything that shouldn't outlive the session.
