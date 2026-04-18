# CLAUDE.md

**MANDATORY**: Act as principal-level engineer. Follow these guidelines exactly.

## 👤 USER CONTEXT

- **Identify users by git credentials**: Extract name from git commit author, GitHub account, or context
- 🚨 **When identity is verified**: ALWAYS use their actual name - NEVER use "the user" or "user"
- **Direct communication**: Use "you/your" when speaking directly to the verified user
- **Discussing their work**: Use their actual name when referencing their commits/contributions
- **Example**: If git shows "John-David Dalton <jdalton@example.com>", refer to them as "John-David"
- **Other contributors**: Use their actual names from commit history/context

## PRE-ACTION PROTOCOL

**MANDATORY**: Review CLAUDE.md before any action. No exceptions.

- Before ANY structural refactor on a file >300 LOC: remove dead code, unused exports, unused imports first — commit that cleanup separately before the real work
- Multi-file changes: break into phases (≤5 files each), verify each phase before the next
- When pointed to existing code as a reference: study it before building — working code is a better spec than any description
- Work from raw error data, not theories — if a bug report has no error output, ask for it
- On "yes", "do it", or "go": execute immediately, no plan recap

## VERIFICATION PROTOCOL

**MANDATORY**: Before claiming any task is complete:

1. Run the actual command — execute the script, run the test, check the output
2. State what you verified, not just "looks good"
3. **FORBIDDEN**: Claiming "Done" when any test output shows failures, or characterizing incomplete/broken work as complete
4. If type-check or lint is configured, run it and fix ALL errors before reporting done
5. Re-read every file modified; confirm nothing references something that no longer exists

## CONTEXT & EDIT SAFETY

- After 10+ messages: re-read any file before editing it — do not trust remembered contents
- Read files >500 LOC in chunks using offset/limit; never assume one read captured the whole file
- Before every edit: re-read the file. After every edit: re-read to confirm the change applied correctly
- When renaming anything, search separately for: direct calls, type references, string literals, dynamic imports, re-exports, test files — one grep is not enough
- Never fix a display/rendering problem by duplicating state — one source of truth, everything reads from it

## JUDGMENT PROTOCOL

- If the user's request is based on a misconception, say so before executing
- If you spot a bug adjacent to what was asked, flag it: "I also noticed X — want me to fix it?"
- You are a collaborator, not just an executor

## SCOPE PROTOCOL

- Do not add features, refactor, or make improvements beyond what was asked — band-aids when asked for band-aids
- Try the simplest approach first; if architecture is actually flawed, flag it and wait for approval before restructuring
- When asked to "make a plan," output only the plan — no code until given the go-ahead

## SELF-EVALUATION

- Before calling anything done: present two views — what a perfectionist would reject vs. what a pragmatist would ship — let the user decide
- After fixing a bug: explain why it happened and what category of bug it represents
- If a fix doesn't work after two attempts: stop, re-read the relevant section top-down, state where the mental model was wrong, propose something fundamentally different
- If asked to "step back" or "we're going in circles": drop everything, rethink from scratch

## HOUSEKEEPING

- Before risky changes: offer to checkpoint — "want me to commit before this?"
- If a file is getting unwieldy (>400 LOC): flag it — "this is big enough to cause pain — want me to split it?"

## ABSOLUTE RULES

- Never create files unless necessary
- Always prefer editing existing files
- Forbidden to create docs unless requested
- Required to do exactly what was asked
- 🚨 **NEVER use `npx`, `pnpm dlx`, or `yarn dlx`** — use `pnpm exec <package>` for devDep binaries, or `pnpm run <script>` for package.json scripts. If a tool is needed, add it as a pinned devDependency first.
- **minimumReleaseAge**: NEVER add packages to `minimumReleaseAgeExclude` in CI. Locally, ASK before adding — the age threshold is a security control.

## ROLE

Principal Software Engineer: production code, architecture, reliability, ownership.

## EVOLUTION

If user repeats instruction 2+ times, ask: "Should I add this to CLAUDE.md?"

## SHARED STANDARDS

### Emoji & Output Style

**Terminal Symbols** (based on `@socketsecurity/lib/logger` LOG_SYMBOLS):

- ✓ Success/checkmark - MUST be green (NOT ✅)
- ✗ Error/failure - MUST be red (NOT ❌)
- ⚠ Warning/caution - MUST be yellow (NOT ⚠️)
- ℹ Info - MUST be blue (NOT ℹ️)
- → Step/progress - MUST be cyan (NOT ➜ or ▶)

**Color**: Apply color to icon ONLY using `yoctocolors-cjs` (NOT ESM `yoctocolors`):

```javascript
import colors from 'yoctocolors-cjs'
;`${colors.green('✓')} ${msg}` // Success
`${colors.red('✗')} ${msg}` // Error
`${colors.yellow('⚠')} ${msg}` // Warning
`${colors.blue('ℹ')} ${msg}` // Info
`${colors.cyan('→')} ${msg}` // Step/Progress
```

Use emojis sparingly (📦 🚀 🎉 💡). Prefer text-based symbols for terminal compatibility.

### Cross-Platform (CRITICAL)

- **MANDATORY**: Work on Windows + POSIX
- **Paths**: Always `path.join()`, `path.resolve()`, `path.sep`
- **Temp**: `os.tmpdir()` + `fs.mkdtemp()` for unique dirs
- **File URLs**: `fileURLToPath()` from `node:url`
- Never hard-code `/` or `\`

### Node.js Compatibility

- **Minimum**: Node.js 18.0.0
- **FORBIDDEN ES2023+**: `toReversed()`, `toSorted()`, `toSpliced()`, `with()`
- **Use instead**: `slice().reverse()`, `slice().sort()`

### Backward Compatibility (CRITICAL)

- 🚨 FORBIDDEN to maintain — we're our only consumers
- Actively remove compat code when encountered (it's dead code)
- Make clean API breaks; never add deprecation paths or compat layers
- Just delete unused code completely

### Safe File Operations (SECURITY CRITICAL)

- 🚨 FORBIDDEN: `fs.rm()`, `fs.rmSync()`, `rm -rf`
- Use `safeDelete()`/`safeDeleteSync()` from `@socketsecurity/lib/fs`
- package.json scripts: use `del-cli`
- HTTP: NEVER `fetch()` — use `httpJson`/`httpText`/`httpRequest` from `@socketsecurity/lib/http-request`
- File existence: ALWAYS `existsSync` from `node:fs`. NEVER `fs.access`, `fs.stat`-for-existence, or an async `fileExists` wrapper. Import form: `import { existsSync, promises as fs } from 'node:fs'`.

### Work Safeguards (CRITICAL)

- Before bulk changes: commit WIP + create backup branch
- FORBIDDEN: automated fix scripts (sed/awk/regex bulk replacements) without backup
- FORBIDDEN: multi-file modifications without backup branch

### Git Workflow

- **Pre-commit**: `pnpm run fix && pnpm run check`
- **--no-verify**: Safe for scripts/workflows/tests/docs; always run hooks for lib/packages
- **Batch commits**: First with hooks, rest with `--no-verify` (after fix + check)
- **Messages**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) style

  ```
  <type>(<scope>): <description>

  Types: feat, fix, docs, style, refactor, test, chore, perf

  Examples:
    feat(auth): add JWT token validation
    fix(parser): resolve memory leak in tokenizer
    chore(release): 1.2.3
  ```

- **NO AI attribution** in commit messages

### Git SHA Management (CRITICAL)

- **NEVER GUESS SHAs**: Use `git rev-parse HEAD` or `git rev-parse main`
- **Format**: `@662bbcab1b7533e24ba8e3446cffd8a7e5f7617e # main` (full 40-char SHA)
- **Why**: GitHub Actions require pinned full SHAs
- **Update workflow refs**: 1) `cd repo && git rev-parse main`, 2) Use full SHA, 3) Verify with `git show <sha>`

### CI Testing Infrastructure

- **MANDATORY**: Use `SocketDev/socket-registry/.github/workflows/ci.yml@<SHA>` with full commit SHA
- **Reusable workflows**: Centralized lint/type-check/test/coverage
- **Matrix testing**: Node.js 22/24, cross-platform
- **CI script naming**: `lint-ci`, `test-ci`, `type-ci` (no watch/fix modes)

### GitHub Actions SHA Pin Cascade (CRITICAL)

**Full reference:** `.claude/skills/updating-workflows/reference.md`
**Command:** `/update-workflows`

Actions and workflows reference each other by full 40-char SHA pinned to main.
When any action changes, update consumers in layer order (Layer 1 -> 2a -> 2b -> 3 -> 4)
via separate PRs. Each PR must merge before the next.

**Key rules:**

- Each layer gets its own PR — never combine layers
- **NEVER type/guess SHAs** — always `git fetch origin main && git rev-parse origin/main` AFTER merge
- **NEVER use a SHA from a PR branch** — only use SHAs from main after the PR merges
- **Verify SHA exists**: `gh api repos/SocketDev/socket-registry/commits/<sha> --jq '.sha'`
- **Propagation SHA = whatever `.github/workflows/_local-not-for-reuse-*.yml` currently pin.** That's the operational source of truth for external repos. Retrieve it with:

  ```bash
  grep -hE 'SocketDev/socket-registry.*@[0-9a-f]{40}' .github/workflows/_local-not-for-reuse-*.yml \
    | grep -oE '@[0-9a-f]{40}' | sort -u
  ```

  Expect **exactly one** SHA. If you get more than one, the Layer 4 bump is incomplete — finish that before propagating. Conceptually this is the Layer 3 merge SHA (after Layer 4 picks it up), but don't try to rederive it — read it from the files.

- When your change is contained to L3/L4 (reusable workflow edits, not L1/L2 actions): skip straight to a Layer 4 bump. External repos pin to L3 workflows + L2 actions, both of which already exist at the new main SHA.
- Don't clobber third-party SHAs when doing blanket replacements
- External repos that consume socket-registry: **direct push** — socket-btm, sdxgen, ultrathink; **PR** — socket-cli, socket-lib, socket-sdk-js, socket-packageurl-js. Note: the `sdxgen` repo's local checkout is named `socket-sdxgen/`, but the GitHub repo is `SocketDev/sdxgen` — use the bare name for `gh` commands.

### Testing & Coverage

#### Test Structure

- **Directories**: `test/npm/` - NPM package tests; `test/registry.test.mts` + `test/packages.test.mts` - registry-level tests
- **Utils**: `test/utils/` - Shared test utilities (see below)
- **Naming**: Descriptive file/describe/test names for coverage clarity
- **Coverage**: MANDATORY - never decrease, always maintain/increase
- **c8 ignore**: Must include reason ending with period

#### Test Helpers

Test helpers available in `test/utils/`:

- `setupNpmPackageTest()` - NPM package test boilerplate (npm-package-helper.mts)
- `itOnWindows/itOnUnix/normalizePath()` - Platform-specific tests (platform-test-helpers.mts)
- `expect*` family (`expectString`, `expectFrozen`, `expectInRange`, `expectDefined`, etc.) - Assertions (assertion-helpers.mts)
- `createTypeCheckerTests()` / `createInvalidValuesExcluding()` - Type-checker test generator (type-checker-helper.mts)

#### Running Tests

- **All tests**: `pnpm test`
- **Specific file**: `pnpm test path/to/file.test.ts`
- **🚨 NEVER USE `--` before test paths** - runs all tests
- **Coverage**: `pnpm run cover`
- **NPM packages**: `node scripts/npm/test-npm-packages.mts` (long-running)

### Test Style — Functional Over Source Scanning

**NEVER write source-code-scanning tests**

Do not read source files and assert on their contents (`.toContain('pattern')`). These tests are brittle and break on any refactor.

- Write functional tests that verify **behavior**, not string patterns
- For modules requiring a built binary: use integration tests
- For pure logic: use unit tests with real function calls

### Vitest Memory Optimization

- **Pool**: `pool: 'forks'`, `singleFork: true`, `maxForks: 1`, `isolate: true`
- **Timeouts**: `testTimeout: 60_000, hookTimeout: 60_000`
- **Threads**: `singleThread: true, maxThreads: 1`
- **Cleanup**: `await safeDelete(paths)` from `@socketsecurity/lib/fs` for all test cleanup

### Vitest Configuration

- **Config**: `.config/vitest.config.mts` — used by `pnpm test`. Uses forks for isolation per § Vitest Memory Optimization.

### Package Management

- **pnpm only** (not npm)
- **Add deps**: `pnpm add <pkg> --save-exact` (exact versions, no `^`/`~`)
- **Workspace**: Use `-w` flag for root
- **Scripts**: `pnpm run <script>`
- **READMEs**: Use `pnpm install` in examples

### Dependency Management

- After editing `package.json` deps: run `pnpm install` to update lockfile
- Commit `pnpm-lock.yaml` with dependency changes
- Never manually edit `pnpm-lock.yaml`

### Script Wrappers

- **Pattern**: Wrap complex commands in `scripts/*.mts` files, not package.json directly
- **Benefits**: Type safety, reusability, testability, better error handling
- **Usage**: `"script-name": "node scripts/script-name.mts"`
- **Examples**: `scripts/cover.mts`, `scripts/test.mts`
- **Structure**: Use `spawn` from `@socketsecurity/lib/spawn` with proper signal handling
- **Exit codes**: Set `process.exitCode`, never call `process.exit()` (except at entry point)
- **Type definitions**: `.mts` scripts declare their own types inline; only write separate `.d.mts` files for legacy `.mjs` utilities

### Documentation Standards

- **Location**: `docs/` folder; monorepos also have `packages/*/docs/`
- **Filenames**: `lowercase-with-hyphens.md` (exception: README.md, LICENSE, CHANGELOG.md, etc.)
- **Style**: Pithy, direct, scannable. Use ASCII diagrams for complex concepts.

### Package.json Scripts Convention

- Prefer single scripts with flags (`pnpm run build --watch`) over multiple variants (`build:watch`, `build:prod`)
- Exception: composite scripts that orchestrate multiple steps

### Code Style - File Organization

- **Extensions**: `.js` (JSDoc), `.mjs` (ES modules), `.mts` (TypeScript modules)
- **Naming**: kebab-case filenames
- **Module headers**: MANDATORY `@fileoverview` as first content
- **Node.js imports**: MANDATORY `node:` prefix (`import path from 'node:path'`)
- **Import sorting**: 1) Node built-ins, 2) External, 3) `@socketsecurity/*`, 4) Local, 5) Types. Blank lines between. Alphabetical within.
- **fs imports**: `import { syncMethod, promises as fs } from 'node:fs'`

### Code Style - Patterns

- **Constants**: `UPPER_SNAKE_CASE`
- **Avoid `null`**: Use `undefined` instead of `null` throughout codebase
  - Default parameters: `function foo(bar = undefined)` or just `function foo(bar)`
  - Variable initialization: `let x` or `let x = undefined`, not `let x = null`
  - Return values: Return `undefined` not `null`
  - Optional properties: Use `?:` syntax, not `| null`
  - Exception: `__proto__: null` for prototype-less objects (required pattern)
  - Exception: External APIs that explicitly require `null`
- \***\*proto\*\***: MANDATORY - Always first in literals: `{ __proto__: null, ...opts }`
- **Null-prototype objects**: Use `Object.create(null)` for empty objects only; `{ __proto__: null, key: val }` when properties exist
- **Options pattern**: MANDATORY `const opts = { __proto__: null, ...options } as SomeOptions`
- **Array destructuring**: Use `{ 0: key, 1: val }` for `Object.entries()` loops (V8 performance)
- **Array checks**: `!array.length` not `array.length === 0`
- **Increments**: `var += 1` not `var++` (standalone statements)
- **Type safety**: FORBIDDEN `any`; use `unknown` or specific types
- **Loop annotations**: FORBIDDEN - Never annotate for...of variables
- **String interpolation**: MANDATORY - Template literals, not concatenation
- **Semicolons**: Omit (except SDK which uses them)

### Code Style - Functions

- **Order**: Alphabetical; private first, then exported
- **Await in loops**: Add `// eslint-disable-next-line no-await-in-loop` when intentional
- **Process spawning**: Use `spawn` from `@socketsecurity/lib/spawn` not `child_process.spawn`
- **spawn() with shell: WIN32**: 🚨 NEVER change `shell: WIN32` to `shell: true`
  - `shell: WIN32` is the correct cross-platform pattern (enables shell on Windows, disables on Unix)
  - If spawn fails with ENOENT, the issue is NOT the shell parameter
  - Fix by properly separating command and arguments instead:

    ```javascript
    // WRONG - passing full command as string
    spawn('python3 -m module arg1 arg2', [], { shell: WIN32 })

    // CORRECT - separate command and args
    spawn('python3', ['-m', 'module', 'arg1', 'arg2'], { shell: WIN32 })
    ```

  - This pattern is canonical across all Socket Security codebases

- **Working directory**: 🚨 NEVER use `process.chdir()` - use `{ cwd }` options and absolute paths instead
  - Breaks tests, worker threads, and causes race conditions
  - Always pass `{ cwd: absolutePath }` to spawn/exec/fs operations

### Code Style - Comments

- **Policy**: Default to NO comments. Only add one when the WHY is non-obvious to a senior engineer reading the code cold
- **Style**: Single-line (`//`) over multiline
- **Periods**: MANDATORY - All comments end with periods (except directives/URLs)
- **Placement**: Own line above code
- **JSDoc**: Description + optional `@throws`. NO `@param`/`@returns`/`@author` — types in signatures already say that. `@example` is only acceptable when the usage is non-obvious (e.g., a surprising invocation pattern, platform-specific quirk, or subtle interaction). If a reader can guess how to call it from the signature, no `@example`.
- **Examples**: `// This validates input.` (correct) | `// this validates` (incorrect)

### Code Style - Sorting

- **MANDATORY**: Sort lists, exports, object properties, destructuring alphabetically
- **Type properties**: Required first, then optional; alphabetical within groups
- **Class members**: 1) Private properties, 2) Private methods, 3) Public methods (all alphabetical)

### Error Handling

- **Catch**: `catch (e)` not `catch (error)`
- **Messages**: Double quotes, descriptive, actionable, NO periods at end
- **Patterns**:
  - `"{field}" is required` or `"{field}" is a required {type}`
  - `"{field}" must be a {type}`
  - `{context} "{field}" {violation}`
  - `failed to parse {format}` or `unable to {action} "{component}"`
- **Requirements**: Throw errors (no silent failures), include `{ cause: e }`, no `process.exit()` except script entry
- **JSDoc**: `@throws {ErrorType} When condition.`

### Changelog Management

- **Format**: `## [version](https://github.com/SocketDev/socket-registry/releases/tag/vversion) - YYYY-MM-DD`
- **Follow**: [Keep a Changelog](https://keepachangelog.com/) format
- **Sections**: Added, Changed, Fixed, Removed
- **Focus**: User-facing changes only (no internal refactoring/deps/CI)

### GitHub Actions

- **MANDATORY**: All actions reference commit SHAs not tags: `uses: owner/repo@sha # vX.Y.Z`
- **Reusable workflows**: Create in socket-registry, reference from other projects
- **Standard SHAs**: actions/checkout@v5, pnpm/action-setup@v4, actions/setup-node@v5, actions/upload-artifact@v4
- **NEVER use `sed` to edit YAML workflow files** — use the Edit tool with exact string matching. `sed` silently clobbers YAML content (SHAs, quoting, indentation)

### Dependency Alignment (MANDATORY)

- **Core deps**: @typescript/native-preview (tsgo), @types/node, typescript-eslint (unified only)
- **DevDeps**: @dotenvx/dotenvx, @vitest/coverage-v8, del-cli, eslint, eslint-plugin-\*, globals, husky, knip, lint-staged, npm-run-all2, oxfmt, taze, type-coverage, vitest, yargs-parser, yoctocolors-cjs
- **FORBIDDEN**: Separate @typescript-eslint/\* packages; use unified `typescript-eslint`
- **TSGO PRESERVATION**: Never replace tsgo with tsc
- **Update**: Use `pnpm run taze` to check/apply updates across all Socket projects

### Scratch Documents

- **Location**: `.claude/` (gitignored) — working notes, never commit

---

## 🏗️ REGISTRY-SPECIFIC

### Architecture

- **Registry source**: `/registry/src/` - TypeScript source (production code)
- **Registry dist**: `/registry/dist/` - Build output (generated by esbuild)
- **Scripts**: `/scripts/` - Dev/build scripts (all `.mts`)
- **Tests**: `/test/` - Test files/fixtures
- **Overrides**: `/packages/npm/` - NPM package overrides
- **Primary export**: `getManifestData(ecosystem, packageName)` from `@socketsecurity/registry`

### Performance

- Optimize for speed without sacrificing correctness (serves Socket security infrastructure)
- Benchmark performance-sensitive changes
- Avoid unnecessary allocations in hot paths

### Package Manager Spawning

- Spawning npm/pnpm/yarn lives in `@socketsecurity/lib/spawn`, not in this repo.

### Commands

- **Dev**: `pnpm run build`, `pnpm run test`, `pnpm run check`, `pnpm run fix`
- **Type check**: `pnpm run type` (tsgo, no emit)
- **Registry**: `pnpm run update`, `pnpm run make-npm-override`, `pnpm run release-npm`
- **Test npm packages**: `node scripts/npm/test-npm-packages.mts` (long-running, tests all overrides)

## Agents & Skills

- `/security-scan` — runs AgentShield + zizmor security audit
- `/quality-scan` — comprehensive code quality analysis
- `/quality-loop` — scan and fix iteratively
- Agents: `code-reviewer`, `security-reviewer`, `refactor-cleaner` (in `.claude/agents/`)
- Shared subskills in `.claude/skills/_shared/`
- Pipeline state tracked in `.claude/ops/queue.yaml`

### Build System

- esbuild for fast compilation (registry)
- TypeScript → CommonJS (unminified for better Node ESM interop)
- Post-build transform: Converts esbuild wrappers to clear `module.exports = { ... }` for Node ESM named imports
- Env configs: `.env.test` (test-only), `.env.precommit` (pre-commit hook runtime)
- Linting: oxlint
- Formatting: oxfmt
