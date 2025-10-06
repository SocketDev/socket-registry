# CLAUDE.md

🚨 **MANDATORY**: Act as principal-level engineer. Follow these guidelines EXACTLY.

## 📍 CANONICAL REFERENCE

This is the **canonical source** for shared Socket standards. Other projects reference this file.

## 🔍 PRE-ACTION PROTOCOL

**🚨 MANDATORY**: Review CLAUDE.md before ANY action. No exceptions.

## 🛡️ ABSOLUTE RULES

- **NEVER** create files unless necessary
- **ALWAYS** prefer editing existing files
- **FORBIDDEN** to create docs unless requested
- **REQUIRED** to do exactly what was asked

## 🎯 YOUR ROLE

Principal Software Engineer: production code, architecture, reliability, ownership.

## 📝 EVOLUTION

If user repeats instruction 2+ times, ask: "Should I add this to CLAUDE.md?"

## 🚀 SHARED STANDARDS

### Cross-Platform (CRITICAL)
- **🚨 MANDATORY**: Work on Windows + POSIX
- **Paths**: Always `path.join()`, `path.resolve()`, `path.sep`
- **Temp**: `os.tmpdir()` + `fs.mkdtemp()` for unique dirs
- **File URLs**: `fileURLToPath()` from `node:url`
- **Never hard-code** `/` or `\`

### Node.js Compatibility
- **Minimum**: Node.js 18.0.0
- **❌ FORBIDDEN ES2023+**: `toReversed()`, `toSorted()`, `toSpliced()`, `with()`
- **✅ Use**: `slice().reverse()`, `slice().sort()`

### Safe File Operations (SECURITY CRITICAL)
- **🚨 MANDATORY**: Use `trash` from `scripts/utils/fs.mjs` for ALL deletions
- **Canonical implementation**: Socket-registry (copy to other projects)
- **Behavior**: Non-CI uses trash; CI uses fs.rm; temp dirs ignore failures
- **Usage**: `import { trash } from './scripts/utils/fs.mjs'` then `await trash(paths)`
- **❌ FORBIDDEN**: Direct `trash` package, `fs.rm()`, `fs.rmSync()`, `rm -rf`

### Git Workflow
- **Pre-commit**: `pnpm run fix && pnpm run check`
- **--no-verify**: Safe for scripts/workflows/tests/docs; always run hooks for lib/packages
- **Batch commits**: First with hooks, rest with `--no-verify` (after fix + check)
- **Messages**: Short, no prefixes, **NO AI attribution**
- **Version bumps**: `Bump to v1.2.3`

### Git SHA Management (CRITICAL)
- **🚨 NEVER GUESS SHAs**: Use `git rev-parse HEAD` or `git rev-parse main`
- **Format**: `@662bbcab1b7533e24ba8e3446cffd8a7e5f7617e # main` (full 40-char SHA)
- **Why**: GitHub Actions require pinned full SHAs
- **Update workflow refs**: 1) `cd repo && git rev-parse main`, 2) Use full SHA, 3) Verify with `git show <sha>`

### CI Testing Infrastructure
- **🚨 MANDATORY**: Use `SocketDev/socket-registry/.github/workflows/ci.yml@<SHA>` with full commit SHA
- **Reusable workflows**: Centralized lint/type-check/test/coverage
- **Matrix testing**: Node.js 20/22/24, cross-platform
- **CI script naming**: `lint-ci`, `test-ci`, `type-ci` (no watch/fix modes)

### Testing & Coverage
- **🚨 NEVER USE `--` before test paths** - runs ALL tests
- **Test single file**: `pnpm test path/to/file.test.ts`
- **Coverage**: 🚨 MANDATORY - never decrease, always maintain/increase
- **c8 ignore**: Must include reason ending with period
- **Naming**: Descriptive file/describe/test names for coverage clarity
- **Structure**: `test/unit/`, `test/integration/`, `test/fixtures/`, `test/utils/`

### Vitest Memory Optimization
- **Pool**: `pool: 'forks'`, `singleFork: true`, `maxForks: 1`, `isolate: true`
- **Memory**: `NODE_OPTIONS="--max-old-space-size=4096 --max-semi-space-size=512"` in `.env.test`
- **Timeouts**: `testTimeout: 60_000, hookTimeout: 60_000`
- **Threads**: `singleThread: true, maxThreads: 1`
- **Cleanup**: `await trash(paths)` for all test cleanup

### Package Management
- **pnpm only** (not npm)
- **Add deps**: `pnpm add <pkg> --save-exact` (exact versions, no `^`/`~`)
- **Workspace**: Use `-w` flag for root
- **Scripts**: `pnpm run <script>`
- **READMEs**: Use `pnpm install` in examples

### Script Wrappers
- **Pattern**: Wrap complex commands in `scripts/*.mts` files, not package.json directly
- **Benefits**: Type safety, reusability, testability, better error handling
- **Usage**: `"script-name": "node scripts/script-name.mts"`
- **Examples**: `scripts/coverage.mts`, `scripts/test-ci.mjs`
- **Structure**: Use `spawn` from node:child_process with proper signal handling
- **Exit codes**: Set `process.exitCode`, never call `process.exit()` (n/no-process-exit rule)
- **Type definitions**: Create `.d.mts` files for `.mjs` utilities used by `.mts` scripts

### Code Style - File Organization
- **Extensions**: `.js` (JSDoc), `.mjs` (ES modules), `.mts` (TypeScript modules)
- **Naming**: kebab-case filenames
- **Module headers**: 🚨 MANDATORY `@fileoverview` as first content
- **Node.js imports**: 🚨 MANDATORY `node:` prefix (`import path from 'node:path'`)
- **Import sorting**: 1) Node built-ins, 2) External, 3) `@socketsecurity/*`, 4) Local, 5) Types. Blank lines between. Alphabetical within.
- **fs imports**: `import { syncMethod, promises as fs } from 'node:fs'`

### Code Style - Patterns
- **Constants**: `UPPER_SNAKE_CASE`
- **Return values**: `undefined` not `null` (except external APIs)
- **__proto__**: 🚨 MANDATORY - Always first in literals: `{ __proto__: null, ...opts }`
- **Null-prototype objects**: Use `Object.create(null)` for empty objects only; `{ __proto__: null, key: val }` when properties exist
- **Options pattern**: 🚨 MANDATORY `const opts = { __proto__: null, ...options } as SomeOptions`
- **Array destructuring**: Use `{ 0: key, 1: val }` for `Object.entries()` loops (V8 performance)
- **Array checks**: `!array.length` not `array.length === 0`
- **Increments**: `var += 1` not `var++` (standalone statements)
- **Type safety**: ❌ FORBIDDEN `any`; use `unknown` or specific types
- **Loop annotations**: ❌ FORBIDDEN - Never annotate for...of variables
- **String interpolation**: 🚨 MANDATORY - Template literals, not concatenation
- **Semicolons**: Omit (except SDK which uses them)

### Code Style - Functions
- **Order**: Alphabetical; private first, then exported
- **Await in loops**: Add `// eslint-disable-next-line no-await-in-loop` when intentional
- **Process spawning**: Use `@socketsecurity/registry/lib/spawn` not `child_process.spawn`

### Code Style - Comments
- **Style**: Single-line (`//`) over multiline
- **Periods**: 🚨 MANDATORY - All comments end with periods (except directives/URLs)
- **Placement**: Own line above code
- **JSDoc**: Description + optional `@throws` only - NO `@param`, `@returns`, `@author`, `@example`
- **Examples**: `// This validates input.` ✅ | `// this validates` ❌

### Code Style - Sorting
- **🚨 MANDATORY**: Sort lists, exports, object properties, destructuring alphabetically
- **Type properties**: Required first, then optional; alphabetical within groups
- **Class members**: 1) Private properties, 2) Private methods, 3) Public methods (all alphabetical)

### Error Handling
- **Catch**: `catch (e)` not `catch (error)`
- **Messages**: Double quotes, descriptive, actionable
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
- **🚨 MANDATORY**: All actions reference commit SHAs not tags: `uses: owner/repo@sha # vX.Y.Z`
- **Reusable workflows**: Create in socket-registry, reference from other projects
- **Standard SHAs**: actions/checkout@v5, pnpm/action-setup@v4, actions/setup-node@v5, actions/upload-artifact@v4

### Dependency Alignment (MANDATORY)
- **Core deps**: @typescript/native-preview (tsgo), @types/node, typescript-eslint (unified only)
- **DevDeps**: @biomejs/biome, @dotenvx/dotenvx, @vitest/coverage-v8, eslint, eslint-plugin-*, globals, husky, knip, lint-staged, npm-run-all2, oxlint, taze, trash, type-coverage, vitest, yargs-parser, yoctocolors-cjs
- **🚨 FORBIDDEN**: Separate @typescript-eslint/* packages; use unified `typescript-eslint`
- **🚨 TSGO PRESERVATION**: NEVER replace tsgo with tsc
- **Update**: Use `pnpm run taze` to check/apply updates across all Socket projects

### Recurring Patterns
1. **__proto__ ordering**: Always first in object literals
2. **Options parameter**: `{ __proto__: null, ...options } as SomeOptions`
3. **Reflect.apply**: `const { apply } = Reflect` + `apply(fn, thisArg, [])`
4. **Import separation**: Type imports separate from runtime
5. **Node.js imports**: Always `node:` prefix

### Scratch Documents
- **Location**: `.claude/` (gitignored)
- **Purpose**: Working notes, analysis, planning
- **🚨 CRITICAL**: NEVER commit

---

## 🏗️ REGISTRY-SPECIFIC

### Architecture
- **Registry lib**: `/registry/lib/` - Core production code
- **Scripts**: `/scripts/` - Dev/build scripts
- **Tests**: `/test/` - Test files/fixtures
- **Overrides**: `/packages/npm/` - NPM package overrides

### Performance
- Optimize for speed without sacrificing correctness (serves Socket security infrastructure)
- Benchmark performance-sensitive changes
- Avoid unnecessary allocations in hot paths

### Package Manager Agent
- `registry/lib/agent.js`: npm/pnpm/yarn (Windows + Unix)
- Functions: `execNpm`, `execPnpm`, `execYarn`

### Commands
- **Dev**: `pnpm run build`, `pnpm run test`, `pnpm run check`, `pnpm run fix`
- **Registry**: `pnpm run update`, `pnpm run make:npm-override`, `pnpm run release:npm`
- **Test npm packages**: `pnpm run test:npm:packages` (long-running, tests all overrides)

### Build System
- Rollup for external dependencies
- TypeScript → CommonJS
- Post-build transform: `exports.default = val` → `module.exports = val`
- Multiple env configs: `.env.local`, `.env.test`, `.env.external`
- Dual linting: oxlint + eslint
- Formatting: Biome
