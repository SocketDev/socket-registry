# CLAUDE.md

**MANDATORY**: Act as principal-level engineer. Follow these guidelines exactly.

<!-- BEGIN FLEET-CANONICAL — sync via socket-repo-template/scripts/sync-scaffolding.mjs. Do not edit downstream. -->

## 📚 Fleet Standards

### Identifying users

Identify users by git credentials and use their actual name. Use "you/your" when speaking directly; use names when referencing contributions.

### Parallel Claude sessions

This repo may have multiple Claude sessions running concurrently against the same checkout, against parallel git worktrees, or against sibling clones. Several common git operations are hostile to that.

**Forbidden in the primary checkout:**

- `git stash` — shared store; another session can `pop` yours
- `git add -A` / `git add .` — sweeps files from other sessions
- `git checkout <branch>` / `git switch <branch>` — yanks the working tree out from under another session
- `git reset --hard` against a non-HEAD ref — discards another session's commits

**Required for branch work:** spawn a worktree.

```bash
git worktree add -b <task-branch> ../<repo>-<task> main
cd ../<repo>-<task>
# edit / commit / push from here; primary checkout is untouched
git worktree remove ../<repo>-<task>
```

**Required for staging:** surgical `git add <specific-file>`. Never `-A` / `.`.

**Never revert files you didn't touch.** If `git status` shows unfamiliar changes, leave them — they belong to another session, an upstream pull, or a hook side-effect.

The umbrella rule: never run a git command that mutates state belonging to a path other than the file you just edited.

### Public-surface hygiene

🚨 The four rules below have hooks that re-print the rule on every public-surface `git` / `gh` command. The rules apply even when the hooks are not installed.

- **Real customer / company names** — never write one into a commit, PR, issue, comment, or release note. Replace with `Acme Inc` or rewrite the sentence to not need the reference. (No enumerated denylist exists — a denylist is itself a leak.)
- **Private repos / internal project names** — never mention. Omit the reference entirely; don't substitute "an internal tool" — the placeholder is a tell.
- **Linear refs** — never put `SOC-123`/`ENG-456`/Linear URLs in code, comments, or PR text. Linear lives in Linear.
- **Publish / release / build-release workflows** — never `gh workflow run|dispatch` or `gh api …/dispatches`. Dispatches are irrevocable. The user runs them manually.

### Commits & PRs

- Conventional Commits `<type>(<scope>): <description>` — NO AI attribution.
- **When adding commits to an OPEN PR**, update the PR title and description to match the new scope. Use `gh pr edit <num> --title … --body …`. The reviewer should know what's in the PR without scrolling commits.
- **Replying to Cursor Bugbot** — reply on the inline review-comment thread, not as a detached PR comment: `gh api repos/{owner}/{repo}/pulls/{pr}/comments/{comment_id}/replies -X POST -f body=…`.

### Programmatic Claude calls

🚨 Workflows / skills / scripts that invoke `claude` CLI or `@anthropic-ai/claude-agent-sdk` MUST set all four lockdown flags: `tools`, `allowedTools`, `disallowedTools`, `permissionMode: 'dontAsk'`. Never `default` mode in headless contexts. Never `bypassPermissions`. See `.claude/skills/programmatic-claude-lockdown/SKILL.md`.

### Tooling

- **Package manager**: `pnpm`. Run scripts via `pnpm run foo --flag`, never `foo:bar`. After `package.json` edits, `pnpm install`.
- 🚨 NEVER use `npx`, `pnpm dlx`, or `yarn dlx` — use `pnpm exec <package>` or `pnpm run <script>` # zizmor: documentation-prohibition
- **`minimumReleaseAge`** — never add packages to `minimumReleaseAgeExclude` in CI. Locally, ASK before adding (security control).
- **Backward compatibility** — FORBIDDEN to maintain. Actively remove when encountered.

### Code style

- **Comments** — default to none. Write one only when the WHY is non-obvious to a senior engineer.
- **Completion** — never leave `TODO` / `FIXME` / `XXX` / shims / stubs / placeholders. Finish 100%. If too large for one pass, ask before cutting scope.
- **`null` vs `undefined`** — use `undefined`. `null` is allowed only for `__proto__: null` or external API requirements.
- **Object literals** — `{ __proto__: null, ... }` for config / return / internal-state.
- **Imports** — no dynamic `await import()`. `node:fs` cherry-picks (`existsSync`, `promises as fs`); `path` / `os` / `url` / `crypto` use default imports. Exception: `fileURLToPath` from `node:url`.
- **HTTP** — never `fetch()`. Use `httpJson` / `httpText` / `httpRequest` from `@socketsecurity/lib/http-request`.
- **File existence** — `existsSync` from `node:fs`. Never `fs.access` / `fs.stat`-for-existence / async `fileExists` wrapper.
- **File deletion** — route every delete through `safeDelete()` / `safeDeleteSync()` from `@socketsecurity/lib/fs`. Never `fs.rm` / `fs.unlink` / `fs.rmdir` / `rm -rf` directly — even for one known file.
- **Edits** — Edit tool, never `sed` / `awk`.
- **Inclusive language** — see [`docs/references/inclusive-language.md`](docs/references/inclusive-language.md) for the substitution table.
- **Sorting** — sort lists alphanumerically; details in [`docs/references/sorting.md`](docs/references/sorting.md). When in doubt, sort.
- **`Promise.race` / `Promise.any` in loops** — never re-race a pool that survives across iterations (the handlers stack). See `.claude/skills/promise-race-pitfall/SKILL.md`.

### 1 path, 1 reference

A path is constructed exactly once. Everywhere else references the constructed value.

- **Within a package**: every script imports its own `scripts/paths.mts`. No `path.join('build', mode, …)` outside that module.
- **Across packages**: package B imports package A's `paths.mts` via the workspace `exports` field. Never `path.join(PKG, '..', '<sibling>', 'build', …)`.
- **Workflows / Dockerfiles / shell** can't `import` TS — construct once, reference by output / `ENV` / variable.

Three-level enforcement: `.claude/hooks/path-guard/` blocks at edit time; `scripts/check-paths.mts` is the whole-repo gate run by `pnpm check`; `/path-guard` is the audit-and-fix skill. Find the canonical owner and import from it.

### Background Bash

Never use `Bash(run_in_background: true)` for test / build commands (`vitest`, `pnpm test`, `pnpm build`, `tsgo`). Backgrounded runs you don't poll get abandoned and leak Node workers. Background mode is for dev servers and long migrations whose results you'll consume. If a run hangs, kill it: `pkill -f "vitest/dist/workers"`. The `.claude/hooks/stale-process-sweeper/` `Stop` hook reaps true orphans as a safety net.

### Judgment & self-evaluation

- If the request is based on a misconception, say so before executing.
- If you spot an adjacent bug, flag it: "I also noticed X — want me to fix it?"
- Fix warnings (lint / type / build / runtime) when you see them — don't leave them for later.
- **Default to perfectionist** when you have latitude. "Works now" ≠ "right."
- Before calling done: perfectionist vs. pragmatist views. Default perfectionist absent a signal.
- If a fix fails twice: stop, re-read top-down, state where the mental model was wrong, try something fundamentally different.

### Error messages

An error message is UI. The reader should fix the problem from the message alone. Four ingredients in order:

1. **What** — the rule, not the fallout (`must be lowercase`, not `invalid`).
2. **Where** — exact file / line / key / field / flag.
3. **Saw vs. wanted** — the bad value and the allowed shape or set.
4. **Fix** — one imperative action (`rename the key to …`).

Use `isError` / `isErrnoException` / `errorMessage` / `errorStack` from `@socketsecurity/lib/errors` over hand-rolled checks. Use `joinAnd` / `joinOr` from `@socketsecurity/lib/arrays` for allowed-set lists. Full guidance in [`docs/references/error-messages.md`](docs/references/error-messages.md).

### Token hygiene

🚨 Never emit the raw value of any secret to tool output, commits, comments, or replies. The `.claude/hooks/token-guard/` `PreToolUse` hook blocks the deterministic patterns (literal token shapes, env dumps, `.env*` reads, unfiltered `curl -H "Authorization:"`, sensitive-name commands without redaction). When the hook blocks a command, rewrite — don't bypass.

Behavior the hook can't catch: redact `token` / `jwt` / `access_token` / `refresh_token` / `api_key` / `secret` / `password` / `authorization` fields when citing API responses. Show key *names* only when displaying `.env.local`. If a user pastes a secret, treat it as compromised and ask them to rotate.

Full hook spec in [`.claude/hooks/token-guard/README.md`](.claude/hooks/token-guard/README.md).

### Agents & skills

- `/security-scan` — AgentShield + zizmor audit
- `/quality-scan` — quality analysis
- Shared subskills in `.claude/skills/_shared/`

<!-- END FLEET-CANONICAL -->

## 🏗️ Registry-Specific

### Architecture

- `/registry/src/` — TypeScript source
- `/registry/dist/` — build output (esbuild)
- `/scripts/` — dev/build scripts (all `.mts`)
- `/test/` — test files/fixtures
- `/packages/npm/` — NPM package overrides
- Primary export: `getManifestData(ecosystem, packageName)` from `@socketsecurity/registry`

### Performance

- Optimize for speed without sacrificing correctness (serves Socket security infrastructure)
- Benchmark performance-sensitive changes
- Avoid unnecessary allocations in hot paths

### Package Manager Spawning

- Lives in `@socketsecurity/lib/spawn`, not this repo.

### Commands

- Dev: `pnpm run build`, `pnpm run test`, `pnpm run check`, `pnpm run fix`
- Type check: `pnpm run type` (tsgo, no emit)
- Registry: `pnpm run update`, `pnpm run make-npm-override`, `pnpm run release-npm`
- Test npm packages: `node scripts/npm/test-npm-packages.mts` (long-running)

### Build System

- esbuild (registry); TypeScript → CommonJS (unminified for Node ESM interop)
- Post-build transform converts esbuild wrappers to clear `module.exports = { ... }` for Node ESM named imports
- Env configs: `.env.test`
- Lint: oxlint. Format: oxfmt.

### Cross-Platform (MANDATORY)

- Must work on Windows + POSIX
- Paths: always `path.join()`, `path.resolve()`, `path.sep` — never hard-code `/` or `\`
- Temp: `os.tmpdir()` + `fs.mkdtemp()`
- File URLs: `fileURLToPath()` from `node:url`

### Node.js Compatibility

- Minimum: Node.js 18.0.0
- **FORBIDDEN ES2023+**: `toReversed()`, `toSorted()`, `toSpliced()`, `with()`
- Use `slice().reverse()`, `slice().sort()` instead

### Git Workflow

- Pre-commit: `pnpm run fix && pnpm run check`
- `--no-verify`: safe for scripts/workflows/tests/docs; always run hooks for lib/packages
- Batch commits: first with hooks, rest with `--no-verify` (after fix + check)
- Messages: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) — `<type>(<scope>): <description>`
- **NO AI attribution** in commit messages
- **Open PRs:** when adding commits to an OPEN PR, ALWAYS update the PR title and description to match the new scope. A title like `chore: foo` after you've added security-fix and docs commits to it is now a lie. Use `gh pr edit <num> --title "..." --body "..."` (or `--body-file`) and rewrite the body so it reflects every commit on the branch, grouped by theme. The reviewer should be able to read the PR description and know what's in it without scrolling commits.

### Git SHA Management

- 🚨 **NEVER GUESS SHAs**: use `git rev-parse HEAD` or `git rev-parse origin/main`
- Format: `@662bbcab1b7533e24ba8e3446cffd8a7e5f7617e # main` (full 40-char SHA)
- GitHub Actions require pinned full SHAs

### GitHub Actions SHA Pin Cascade

Layer definitions and cascade procedure: see `.claude/skills/updating-workflows/` — command `/update-workflows`, full reference at `.claude/skills/updating-workflows/reference.md`.

Actions and workflows reference each other by full 40-char SHA pinned to main. When any action changes, update consumers in layer order (Layer 1 → 2a → 2b → 3 → 4) via separate PRs. Each PR must merge before the next.

- Each layer gets its own PR — never combine layers
- 🚨 **NEVER type/guess SHAs** — `git fetch origin main && git rev-parse origin/main` AFTER merge
- 🚨 **NEVER use a SHA from a PR branch** — only SHAs from main after merge
- Verify SHA: `gh api repos/SocketDev/socket-registry/commits/<sha> --jq '.sha'`
- **Propagation SHA** = whatever `.github/workflows/_local-not-for-reuse-*.yml` currently pin. That's the source of truth for external repos:

  ```bash
  grep -hE 'SocketDev/socket-registry.*@[0-9a-f]{40}' .github/workflows/_local-not-for-reuse-*.yml \
    | grep -oE '@[0-9a-f]{40}' | sort -u
  ```

  Expect **exactly one** SHA. More than one = Layer 4 bump incomplete; finish it before propagating.

- L3/L4-only changes (reusable workflow edits, no L1/L2 action changes): skip to Layer 4 bump
- Don't clobber third-party SHAs during blanket replacements
- Consumer repos: **direct push** — socket-btm, sdxgen, stuie, ultrathink; **PR** — socket-cli, socket-lib, socket-sdk-js, socket-packageurl-js. Note: `sdxgen` local checkout is `socket-sdxgen/` but GitHub repo is `SocketDev/sdxgen` — use bare name for `gh` commands. `stuie` local checkout is `socket-tui/` but GitHub repo is `SocketDev/stuie`.

### CI Testing Infrastructure

- **MANDATORY**: Use `SocketDev/socket-registry/.github/workflows/ci.yml@<SHA>` with full commit SHA
- Reusable workflows centralize lint/type-check/test/coverage
- Matrix: Node.js 22/24, cross-platform
- CI script naming: `lint-ci`, `test-ci`, `type-ci` (no watch/fix modes)

### GitHub Actions

- **MANDATORY**: actions reference commit SHAs, not tags — `uses: owner/repo@sha # vX.Y.Z`
- Standard SHAs: actions/checkout@v5, pnpm/action-setup@v4, actions/setup-node@v5, actions/upload-artifact@v4
- 🚨 **NEVER use `sed` (or `awk`/`perl -i`/other stream editors) to edit YAML workflow files** — use the Edit tool, one occurrence at a time, with `replace_all` when the old_string is unique. This applies even for "safe-looking" bulk swaps like SHA bumps across many files — `sed` silently clobbers quoting/indentation on lines the regex wasn't designed for, and failures are invisible until CI parses the file. If the swap spans many files, loop over them with Edit calls, not a single `sed -i`.

### Testing

- Dirs: `test/npm/` (NPM package tests), `test/registry.test.mts` + `test/packages.test.mts` (registry-level)
- Utils: `test/utils/` — `setupNpmPackageTest()`, `itOnWindows/itOnUnix/normalizePath()`, `expect*` helpers, `createTypeCheckerTests()`
- Coverage: **MANDATORY** — never decrease; `c8 ignore` must include reason ending with period
- Commands: `pnpm test`, `pnpm test path/to/file.test.ts`, `pnpm run cover`, `node scripts/npm/test-npm-packages.mts`
- 🚨 **NEVER use `--` before test paths** — runs ALL tests
- **NEVER write source-scanning tests** (reading source files and asserting on contents). Write functional tests that verify behavior.

### Vitest Configuration

- Config: `.config/vitest.config.mts` (used by `pnpm test`). Uses forks for isolation.
- Pool: `pool: 'forks'`, `singleFork: true`, `maxForks: 1`, `isolate: true`
- Threads: `singleThread: true, maxThreads: 1`
- Timeouts: `testTimeout: 60_000, hookTimeout: 60_000`
- Cleanup: `await safeDelete(paths)` from `@socketsecurity/lib/fs`

### Package Management

- **pnpm only** (not npm)
- Add deps: `pnpm add <pkg> --save-exact` (exact versions, no `^`/`~`)
- Workspace root: `-w` flag
- After editing `package.json` deps: run `pnpm install`, commit `pnpm-lock.yaml`, never manually edit it
- READMEs use `pnpm install`

### Script Wrappers

- Wrap complex commands in `scripts/*.mts`, not package.json directly: `"script-name": "node scripts/script-name.mts"`
- Use `spawn` from `@socketsecurity/lib/spawn` with signal handling
- Set `process.exitCode`; never call `process.exit()` except at entry point
- `.mts` scripts declare types inline; only write `.d.mts` for legacy `.mjs` utilities
- Prefer single scripts with flags (`pnpm run build --watch`) over variants (`build:watch`)

### Documentation

- Location: `docs/` (monorepos also `packages/*/docs/`)
- Filenames: `lowercase-with-hyphens.md` (except README.md, LICENSE, CHANGELOG.md)
- Style: pithy, direct, scannable; ASCII diagrams for complex concepts

### Error Handling

- `catch (e)` not `catch (error)`
- Messages: double quotes, descriptive, actionable, NO periods at end
- Patterns:
  - `"{field}" is required` / `"{field}" is a required {type}`
  - `"{field}" must be a {type}`
  - `{context} "{field}" {violation}`
  - `failed to parse {format}` / `unable to {action} "{component}"`
- Throw errors (no silent failures); include `{ cause: e }` when wrapping; no `process.exit()` except script entry
- JSDoc: `@throws {ErrorType} When condition.`

### Dependency Alignment

- Core: @typescript/native-preview (tsgo), @types/node, typescript-eslint (unified only)
- DevDeps: @dotenvx/dotenvx, @vitest/coverage-v8, del-cli, eslint, eslint-plugin-\*, globals, husky, knip, lint-staged, npm-run-all2, oxfmt, taze, type-coverage, vitest, yargs-parser, yoctocolors-cjs
- **FORBIDDEN**: separate `@typescript-eslint/*` packages; use unified `typescript-eslint`
- **TSGO PRESERVATION**: never replace tsgo with tsc
- Update: `pnpm run taze`

### Scratch Documents

- Location: `.claude/` (gitignored) — working notes, never commit

---
