# CLAUDE.md

**MANDATORY**: Act as principal-level engineer. Follow these guidelines exactly.

## USER CONTEXT

- Identify users by git credentials (commit author, GitHub account); use their actual name, never "the user"
- Use "you/your" when speaking directly; use names when referencing their commits/contributions
- Example: git shows "John-David Dalton <jdalton@example.com>" → "John-David"

## PARALLEL CLAUDE SESSIONS - WORKTREE REQUIRED

**This repo may have multiple Claude sessions running concurrently against the same checkout, against parallel git worktrees, or against sibling clones.** Several common git operations are hostile to that and silently destroy or hijack the other session's work.

- **FORBIDDEN in the primary checkout** (the one another Claude may be editing):
  - `git stash` — shared stash store; another session can `pop` yours.
  - `git add -A` / `git add .` — sweeps files belonging to other sessions.
  - `git checkout <branch>` / `git switch <branch>` — yanks the working tree out from under another session.
  - `git reset --hard` against a non-HEAD ref — discards another session's commits.
- **REQUIRED for branch work**: spawn a worktree instead of switching branches in place. Each worktree has its own HEAD, so branch operations inside it are safe.

  ```bash
  # From the primary checkout — does NOT touch the working tree here.
  git worktree add -b <task-branch> ../<repo>-<task> main
  cd ../<repo>-<task>
  # edit, commit, push from here; the primary checkout is untouched.
  cd -
  git worktree remove ../<repo>-<task>
  ```

- **REQUIRED for staging**: surgical `git add <specific-file> [<file>…]` with explicit paths. Never `-A` / `.`.
- **If you need a quick WIP save**: commit on a new branch from inside a worktree, not a stash.

The umbrella rule: never run a git command that mutates state belonging to a path other than the file you just edited.

## PRE-ACTION PROTOCOL

**MANDATORY**: Review CLAUDE.md before any action. No exceptions.

- Before ANY structural refactor on a file >300 LOC: remove dead code first, commit separately
- Multi-file changes: phases of ≤5 files, verify each before the next
- Study existing code before building — working code is a better spec than any description
- Work from raw error data, not theories — if no error output, ask for it
- On "yes", "do it", or "go": execute immediately, no plan recap

## VERIFICATION PROTOCOL

1. Run the actual command — execute, don't assume
2. State what you verified, not just "looks good"
3. **FORBIDDEN**: Claiming "Done" when tests show failures
4. Run type-check/lint if configured; fix ALL errors before reporting done
5. Re-read every modified file; confirm nothing references removed items

## CONTEXT & EDIT SAFETY

- After 10+ messages: re-read files before editing
- Read files >500 LOC in chunks using offset/limit
- Before every edit: re-read. After every edit: re-read to confirm
- When renaming: search direct calls, type refs, string literals, dynamic imports, re-exports, tests
- Never fix a display bug by duplicating state — one source of truth

## JUDGMENT PROTOCOL

- If the user's request is based on a misconception, say so before executing
- If you spot a bug adjacent to what was asked, flag it: "I also noticed X — want me to fix it?"
- You are a collaborator, not just an executor
- Fix warnings when you find them (lint, type-check, build, runtime) — don't leave them for later
- **Default to perfectionist mindset**: when you have latitude to choose, pick the maximally correct option — no shortcuts, no cosmetic deferrals, no "good enough." Fix state that _looks_ stale even if not load-bearing (orphaned refs, rc.2 entries after an rc.3 bump, dead comments). If pragmatism is the right call, the user will ask for it explicitly. "Works now" ≠ "right."

## SCOPE PROTOCOL

- Do not add features or improvements beyond what was asked — band-aids when asked for band-aids
- Simplest approach first; flag architectural flaws and wait for approval
- When asked to "make a plan," output only the plan — no code until given the go-ahead

## SELF-EVALUATION

- Before calling done: present two views — perfectionist reject vs. pragmatist ship — and let the user decide. If the user gives no signal, default to perfectionist: do the fuller fix.
- After fixing a bug: explain why it happened and what category of bug it is
- If a fix fails twice: stop, re-read top-down, state where the mental model was wrong, try something fundamentally different
- On "step back" or "we're going in circles": drop everything, rethink from scratch

## HOUSEKEEPING

- Offer to checkpoint before risky changes
- Flag files >400 LOC for potential splitting

## ERROR MESSAGES

An error message is UI. The reader should be able to fix the problem from the message alone, without opening your source.

Every message needs four ingredients, in order:

1. **What** — the rule that was broken (e.g. "must be lowercase"), not the fallout ("invalid").
2. **Where** — the exact file, line, key, field, or CLI flag. Not "somewhere in config".
3. **Saw vs. wanted** — the bad value and the allowed shape or set.
4. **Fix** — one concrete action, in imperative voice (`rename the key to …`, not `the key was not renamed`).

Length depends on the audience:

- **Library API errors** (thrown from a published package): terse. Callers may match on the message text, so every word counts. All four ingredients often fit in one sentence — e.g. `name "__proto__" cannot start with an underscore` covers rule, where (`name`), saw (`__proto__`), and implies the fix.
- **Validator / config / build-tool errors** (developer reading a terminal): verbose. Give each ingredient its own words so the reader can find the bad record without re-running the tool.
- **Programmatic errors** (internal assertions, invariant checks): terse, rule only. No end user will see it; short keeps the check readable.

Rules for every message:

- Imperative voice for the fix — `add "filename" to part 3`, not `"filename" was missing`.
- Never "invalid" on its own. `invalid filename 'My Part'` is fallout; `filename 'My Part' must be [a-z]+ (lowercase, no spaces)` is a rule.
- On a collision, name **both** sides, not just the second one found.
- Suggest, don't auto-correct. Silently fixing state hides the bug next time.
- Bloat check: if removing a word keeps the information, drop it.
- For allowed-set / conflict lists, use `joinAnd` / `joinOr` from `@socketsecurity/lib/arrays` — `must be one of: ${joinOr(allowed)}` reads better than a hand-formatted list.

Examples:

- ✗ `Error: invalid config` → ✓ `config.json: part 3 is missing "filename". Add a lowercase filename (e.g. "parsing").`
- ✗ `Error: invalid component` → ✓ `npm "name" component is required`

See `docs/references/error-messages.md` for worked examples and anti-patterns.

## ABSOLUTE RULES

- Never create files unless necessary; always prefer editing existing files
- Forbidden to create docs unless requested
- 🚨 **NEVER use `npx`, `pnpm dlx`, or `yarn dlx`** — use `pnpm exec <pkg>` or `pnpm run <script>`; add tools as pinned devDependencies first # zizmor: documentation-prohibition
- **minimumReleaseAge**: NEVER add packages to `minimumReleaseAgeExclude` in CI. Locally, ASK before adding — the age threshold is a security control.

## EVOLUTION

If user repeats an instruction 2+ times, ask: "Should I add this to CLAUDE.md?"

---

## SHARED STANDARDS

### Emoji & Output Style

**Terminal symbols** (from `@socketsecurity/lib/logger` LOG_SYMBOLS):

- ✓ Success — green (NOT ✅)
- ✗ Error — red (NOT ❌)
- ⚠ Warning — yellow (NOT ⚠️)
- ℹ Info — blue (NOT ℹ️)
- → Step — cyan (NOT ➜ or ▶)

Color the icon only, using `yoctocolors-cjs` (NOT ESM `yoctocolors`):

```javascript
import colors from 'yoctocolors-cjs'
const success = `${colors.green('✓')} ${msg}`
const error = `${colors.red('✗')} ${msg}`
const warning = `${colors.yellow('⚠')} ${msg}`
const info = `${colors.blue('ℹ')} ${msg}`
const step = `${colors.cyan('→')} ${msg}`
```

Use emojis sparingly. Prefer text symbols for terminal compatibility.

### Cross-Platform (MANDATORY)

- Must work on Windows + POSIX
- Paths: always `path.join()`, `path.resolve()`, `path.sep` — never hard-code `/` or `\`
- Temp: `os.tmpdir()` + `fs.mkdtemp()`
- File URLs: `fileURLToPath()` from `node:url`

### Node.js Compatibility

- Minimum: Node.js 18.0.0
- **FORBIDDEN ES2023+**: `toReversed()`, `toSorted()`, `toSpliced()`, `with()`
- Use `slice().reverse()`, `slice().sort()` instead

### Backward Compatibility

- 🚨 FORBIDDEN to maintain — we're our only consumers. Remove compat code on sight. Make clean breaks; no deprecation paths.

### Safe File Operations (SECURITY CRITICAL)

- 🚨 FORBIDDEN: `fs.rm()`, `fs.rmSync()`, `rm -rf`. Use `safeDelete()`/`safeDeleteSync()` from `@socketsecurity/lib/fs`.
- package.json scripts: use `del-cli`
- 🚨 HTTP: NEVER `fetch()` — use `httpJson`/`httpText`/`httpRequest` from `@socketsecurity/lib/http-request`
- 🚨 File existence: ALWAYS `existsSync` from `node:fs`. NEVER `fs.access`, `fs.stat`-for-existence, or an async `fileExists` wrapper. Import: `import { existsSync, promises as fs } from 'node:fs'`

### Work Safeguards

- Before bulk changes: commit WIP + create backup branch
- FORBIDDEN: automated fix scripts (sed/awk/regex bulk replacements) without backup
- FORBIDDEN: multi-file modifications without backup branch

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

### Code Style — File Organization

- Extensions: `.js` (JSDoc), `.mjs` (ES modules), `.mts` (TypeScript modules)
- kebab-case filenames
- **MANDATORY** `@fileoverview` as first content
- **MANDATORY** `node:` prefix for Node imports
- Import sorting: 1) Node built-ins, 2) External, 3) `@socketsecurity/*`, 4) Local, 5) Types. Blank lines between groups, alphabetical within.
- fs imports: `import { syncMethod, promises as fs } from 'node:fs'`

### Code Style — Patterns

- Constants: `UPPER_SNAKE_CASE`
- **Avoid `null`** — use `undefined` everywhere
  - Default params: `function foo(bar = undefined)` or `function foo(bar)`
  - Init: `let x` or `let x = undefined`, not `let x = null`
  - Return `undefined`, not `null`
  - Optional properties: `?:` not `| null`
  - Exceptions: `__proto__: null` (required pattern); external APIs requiring `null`
- **`__proto__`**: MANDATORY first in literals: `{ __proto__: null, ...opts }`
- Null-prototype objects: `Object.create(null)` for empty; `{ __proto__: null, key: val }` with props
- Options pattern: MANDATORY `const opts = { __proto__: null, ...options } as SomeOptions`
- Array destructuring: `{ 0: key, 1: val }` for `Object.entries()` loops (V8 perf)
- Array checks: `!array.length` not `array.length === 0`
- Increments: `var += 1` not `var++` (standalone)
- Type safety: FORBIDDEN `any`; use `unknown` or specific types
- Loop annotations: FORBIDDEN on `for...of` variables
- Strings: MANDATORY template literals, not concatenation
- Semicolons: omit (except SDK which uses them)

### Code Style — Functions

- Order: alphabetical; private first, then exported
- `await` in loops: add `// eslint-disable-next-line no-await-in-loop` when intentional
- Process spawning: use `spawn` from `@socketsecurity/lib/spawn`, not `child_process.spawn`
- **spawn() with `shell: WIN32`**: 🚨 NEVER change to `shell: true`
  - `shell: WIN32` is the correct cross-platform pattern (shell on Windows, off on Unix)
  - ENOENT means args are wrong, not the shell param. Separate command and args:

    ```javascript
    // WRONG — full command as string
    spawn('python3 -m module arg1 arg2', [], { shell: WIN32 })

    // CORRECT
    spawn('python3', ['-m', 'module', 'arg1', 'arg2'], { shell: WIN32 })
    ```

- **Working directory**: 🚨 NEVER use `process.chdir()` — pass `{ cwd: absolutePath }` to spawn/exec/fs. `process.chdir` breaks tests, worker threads, and causes races.

### Code Style — Comments

- Default to NO comments. Add one only when the WHY is non-obvious to a senior engineer reading cold.
- Single-line (`//`) over multiline
- **MANDATORY** all comments end with periods (except directives/URLs)
- Own line above code
- JSDoc: description + optional `@throws`. NO `@param`/`@returns`/`@author` — types in signatures say that. `@example` only when the call site is non-obvious.

### Sorting

Sort lists alphanumerically (literal byte order, ASCII before letters). Apply this to:

- **Config lists** — `permissions.allow` / `permissions.deny` in `.claude/settings.json`, `external-tools.json` checksum keys, allowlists in workflow YAML.
- **Object key entries** — sort keys in plain JSON config + return-shape literals + internal-state objects. (Exception: `__proto__: null` always comes first, ahead of any data keys.)
- **Import specifiers** — sort named imports inside a single statement: `import { encrypt, randomDataKey, wrapKey } from './crypto.mts'`. Imports that say `import type` follow the same rule. Statement *order* is the project's existing convention (`node:` → external → local → types) — that's separate from specifier order *within* a statement.
- **Method / function source placement** — within a module, sort top-level functions alphabetically. Convention: private functions (lowercase / un-exported) sort first, exported functions second. The first-line `export` keyword is the divider.
- **Array literals** — when the array is a config list, allowlist, or set-like collection. Position-bearing arrays (e.g. argv, anything where index matters semantically) keep their meaningful order.

When in doubt, sort. The cost of a sorted list that didn't need to be is approximately zero; the cost of an unsorted list that did need to be is a merge conflict.

### Code Style — Sorting

- **MANDATORY** sort lists, exports, object properties, destructuring alphabetically
- Type properties: required first, then optional; alphabetical within groups
- Class members: 1) private properties, 2) private methods, 3) public methods (all alphabetical)

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

### Changelog

- Format: `## [version](https://github.com/SocketDev/socket-registry/releases/tag/vversion) - YYYY-MM-DD`
- Follow [Keep a Changelog](https://keepachangelog.com/)
- Sections: Added, Changed, Fixed, Removed
- User-facing only (no internal refactoring/deps/CI)

### Dependency Alignment

- Core: @typescript/native-preview (tsgo), @types/node, typescript-eslint (unified only)
- DevDeps: @dotenvx/dotenvx, @vitest/coverage-v8, del-cli, eslint, eslint-plugin-\*, globals, husky, knip, lint-staged, npm-run-all2, oxfmt, taze, type-coverage, vitest, yargs-parser, yoctocolors-cjs
- **FORBIDDEN**: separate `@typescript-eslint/*` packages; use unified `typescript-eslint`
- **TSGO PRESERVATION**: never replace tsgo with tsc
- Update: `pnpm run taze`

### Scratch Documents

- Location: `.claude/` (gitignored) — working notes, never commit

---

## REGISTRY-SPECIFIC

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

## Agents & Skills

- `/security-scan` — AgentShield + zizmor security audit
- `/quality-scan` — comprehensive code quality analysis
- `/quality-loop` — scan and fix iteratively
- Agents: `code-reviewer`, `security-reviewer`, `refactor-cleaner` (in `.claude/agents/`)
- Shared subskills in `.claude/skills/_shared/`
- Pipeline state: `.claude/ops/queue.yaml`
