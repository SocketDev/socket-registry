# CLAUDE.md

**MANDATORY**: Act as principal-level engineer. Follow these guidelines exactly.

## CANONICAL REFERENCE

This is the canonical source for shared Socket standards. Other projects reference this file.

## PRE-ACTION PROTOCOL

**MANDATORY**: Review CLAUDE.md before any action. No exceptions.

## VERIFICATION PROTOCOL

**MANDATORY**: Before claiming any task is complete:
1. Test the solution end-to-end
2. Verify all changes work as expected
3. Run the actual commands to confirm functionality
4. Never claim "Done" without verification

## ABSOLUTE RULES

- Never create files unless necessary
- Always prefer editing existing files
- Forbidden to create docs unless requested
- Required to do exactly what was asked

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

**Color Requirements**:
```javascript
colors.green(`✓ ${msg}`)   // Success
colors.red(`✗ ${msg}`)     // Error
colors.yellow(`⚠ ${msg}`)  // Warning
colors.blue(`ℹ ${msg}`)    // Info
```

**Allowed Emojis** (use sparingly):
- 📦 Packages
- 💡 Ideas/tips
- 🚀 Launch/deploy/excitement
- 🎉 Major success/celebration

**General Philosophy**:
- Prefer colored text-based symbols (✓✗⚠ℹ) for maximum terminal compatibility
- Always color-code symbols: green=success, red=error, yellow=warning, blue=info
- Use emojis sparingly for emphasis and delight
- Avoid emoji overload - less is more
- When in doubt, use plain text

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

### Backward Compatibility (IMPORTANT)
- **NO BACKWARD COMPATIBILITY**: Don't maintain it - we're our only consumers
- **Breaking changes**: Inform about them, but don't add compat layers
- **Dead code**: Backward compat code becomes dead code in our ecosystem
- **Clean breaks**: Make clean API changes without deprecation paths
- **Migration**: Quick internal updates preferred over gradual deprecation

### Safe File Operations (SECURITY CRITICAL)
- **MANDATORY**: Use `del` package for deletions
- **Usage**: `import { deleteAsync as del } from 'del'` then `await del(paths)`
- **Temp directories**: Use `{ force: true }` option when deleting temp dirs outside CWD
- **Comment usage**: Always comment `{ force: true }` explaining why (e.g., "Force delete temp directory outside CWD.")
- **FORBIDDEN**: `fs.rm()`, `fs.rmSync()`, `rm -rf` commands

### Work Safeguards (CRITICAL - PREVENTS DATA LOSS)
- **MANDATORY BEFORE ANY BULK CHANGES**:
  1. Commit work in progress first (`git add . && git commit -m "WIP before changes"`)
  2. Create backup branch (`git checkout -b backup-before-<change>`)
  3. Switch back to working branch (`git checkout <original-branch>`)
  4. Then attempt changes
- **FORBIDDEN**: Automated fix scripts (sed, awk, regex bulk replacements)
- **FORBIDDEN**: Running any script that modifies multiple files without backup
- **WHY**: Prevents irreversible corruption, enables easy recovery
- **RECOVERY**: If something goes wrong: `git checkout backup-before-<change> .`

### Git Workflow
- **Pre-commit**: `pnpm run fix && pnpm run check`
- **--no-verify**: Safe for scripts/workflows/tests/docs; always run hooks for lib/packages
- **Batch commits**: First with hooks, rest with `--no-verify` (after fix + check)
- **Messages**: Short, no prefixes, **NO AI attribution**
- **Version bumps**: `Bump to v1.2.3`

### Git SHA Management (CRITICAL)
- **NEVER GUESS SHAs**: Use `git rev-parse HEAD` or `git rev-parse main`
- **Format**: `@662bbcab1b7533e24ba8e3446cffd8a7e5f7617e # main` (full 40-char SHA)
- **Why**: GitHub Actions require pinned full SHAs
- **Update workflow refs**: 1) `cd repo && git rev-parse main`, 2) Use full SHA, 3) Verify with `git show <sha>`

### CI Testing Infrastructure
- **MANDATORY**: Use `SocketDev/socket-registry/.github/workflows/ci.yml@<SHA>` with full commit SHA
- **Reusable workflows**: Centralized lint/type-check/test/coverage
- **Matrix testing**: Node.js 20/22/24, cross-platform
- **CI script naming**: `lint-ci`, `test-ci`, `type-ci` (no watch/fix modes)

### Testing & Coverage

#### Test Structure
- **Directories**: `test/npm/` - NPM package tests, `test/registry/` - Registry tests
- **Fixtures**: `test/fixtures/` - Test fixtures
- **Utils**: `test/utils/` - Shared test utilities (see below)
- **Naming**: Descriptive file/describe/test names for coverage clarity
- **Coverage**: MANDATORY - never decrease, always maintain/increase
- **c8 ignore**: Must include reason ending with period

#### Test Helpers (`test/utils/`)

**NPM Package Helper** (`npm-package-helper.mts`)
```typescript
import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

// Replaces ~15-20 lines of boilerplate per test
const { module: assert, pkgPath, skip, eco, sockRegPkgName } =
  await setupNpmPackageTest(__filename)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('should work', () => {
    expect(assert).toBeDefined()
  })
})
```

**Temp File Helper** (`temp-file-helper.mts`)
```typescript
import { withTempDir, withTempFile, runWithTempDir } from '../utils/temp-file-helper.mts'

// Temp directory with cleanup
const { path: tmpDir, cleanup } = await withTempDir('test-prefix-')
try {
  // Use tmpDir...
} finally {
  await cleanup()
}

// Or with callback (auto cleanup):
await runWithTempDir(async (tmpDir) => {
  // Use tmpDir... cleanup happens automatically
}, 'test-prefix-')

// Temp file
const { path: tmpFile, cleanup } = await withTempFile('content', {
  extension: '.json',
  prefix: 'config-'
})
```

**Platform Test Helpers** (`platform-test-helpers.mts`)
```typescript
import { platform, itOnWindows, itOnUnix, normalizePath } from '../utils/platform-test-helpers.mts'

describe('cross-platform tests', () => {
  itOnWindows('should handle Windows paths', () => {
    expect(path.sep).toBe('\\')
  })

  itOnUnix('should handle Unix paths', () => {
    expect(path.sep).toBe('/')
  })

  it('should compare paths cross-platform', () => {
    expectNormalizedPath('C:\\Users\\test', '/c/Users/test')
  })
})
```

**Assertion Helpers** (`assertion-helpers.mts`)
```typescript
import { expectString, expectFrozen, expectHasProperties } from '../utils/assertion-helpers.mts'

it('should validate config', () => {
  expectString(config.apiKey)
  expectFrozen(config)
  expectHasProperties(config, ['apiKey', 'baseUrl', 'timeout'])
})
```

#### Running Tests
- **All tests**: `pnpm test`
- **Specific file**: `pnpm test path/to/file.test.ts`
- **🚨 NEVER USE `--` before test paths** - runs all tests
- **Coverage**: `pnpm run cover`
- **NPM packages**: `pnpm run test:npm:packages` (long-running)

#### Migration Guide
See `test/utils/TEST_HELPERS_README.md` for:
- Detailed usage examples (before/after patterns)
- Migration strategy and phases
- Potential line savings per helper
- Best practices and patterns

#### Best Practices
- **Use helpers**: setupNpmPackageTest(), withTempDir(), itOnWindows(), etc.
- **Auto cleanup**: Always use cleanup functions for temp resources
- **Platform-aware**: Use platform helpers for cross-platform tests
- **Descriptive names**: Clear test names for coverage reports
- **Combine helpers**: Mix helpers for maximum impact

### Vitest Memory Optimization
- **Pool**: `pool: 'forks'`, `singleFork: true`, `maxForks: 1`, `isolate: true`
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
- **Module headers**: MANDATORY `@fileoverview` as first content
- **Node.js imports**: MANDATORY `node:` prefix (`import path from 'node:path'`)
- **Import sorting**: 1) Node built-ins, 2) External, 3) `@socketsecurity/*`, 4) Local, 5) Types. Blank lines between. Alphabetical within.
- **fs imports**: `import { syncMethod, promises as fs } from 'node:fs'`

### Code Style - Patterns
- **Constants**: `UPPER_SNAKE_CASE`
- **Return values**: `undefined` not `null` (except external APIs)
- **__proto__**: MANDATORY - Always first in literals: `{ __proto__: null, ...opts }`
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
- **Process spawning**: Use `@socketsecurity/registry/lib/spawn` not `child_process.spawn`

### Code Style - Comments
- **Style**: Single-line (`//`) over multiline
- **Periods**: MANDATORY - All comments end with periods (except directives/URLs)
- **Placement**: Own line above code
- **JSDoc**: Description + optional `@throws` only - NO `@param`, `@returns`, `@author`, `@example`
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

### Dependency Alignment (MANDATORY)
- **Core deps**: @typescript/native-preview (tsgo), @types/node, typescript-eslint (unified only)
- **DevDeps**: @biomejs/biome, @dotenvx/dotenvx, @vitest/coverage-v8, eslint, eslint-plugin-*, globals, husky, knip, lint-staged, npm-run-all2, taze, trash, type-coverage, vitest, yargs-parser, yoctocolors-cjs
- **FORBIDDEN**: Separate @typescript-eslint/* packages; use unified `typescript-eslint`
- **TSGO PRESERVATION**: Never replace tsgo with tsc
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
- **CRITICAL**: Never commit

---

## REGISTRY-SPECIFIC

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
- Linting: eslint
- Formatting: Biome
