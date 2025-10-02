# CLAUDE.md

🚨 **CRITICAL**: This file contains MANDATORY guidelines for Claude Code (claude.ai/code). You MUST follow these guidelines EXACTLY as specified. Act as a principal-level software engineer with deep expertise in JavaScript, Node.js, and package registry management.

## 📝 CLAUDE.MD EVOLUTION

### Pattern Recognition & Documentation
- **🚨 MANDATORY**: If the user repeatedly tells you to change or do something in multiple conversations, ask if it should be added to CLAUDE.md
- **Examples of candidates**: Repeated code style corrections, consistent testing patterns, frequent workflow changes, recurring error fixes
- **Question format**: "I notice you've mentioned [pattern] multiple times. Should I add this as a guideline to CLAUDE.md for consistency across projects?"
- **Update trigger**: If the same instruction comes up 2+ times in different contexts, proactively suggest adding it to documentation

## 📚 Learning & Knowledge Sharing

### Self-Learning Protocol
Claude Code should periodically scan and learn from CLAUDE.md files across Socket repositories:
- `socket-cli/CLAUDE.md`
- `socket-packageurl-js/CLAUDE.md`
- `socket-registry/CLAUDE.md`
- `socket-sdk-js/CLAUDE.md`

When working in any Socket repository, check for updates and patterns in other claude.md files to ensure consistency across the ecosystem.

### Cross-Project Learning
- When discovering generally applicable patterns or guidelines, update CLAUDE.md files in other socket- projects
- Examples: c8 comment formatting, error handling patterns, code style rules, test organization patterns, workflow patterns
- This ensures consistency across the Socket ecosystem

### Recent Learnings Applied
- **Test Organization**: Modular test files improve maintainability across all projects
- **Error Message Consistency**: Use consistent error message patterns across all Socket projects
- **Safe File Removal**: Use safeRemove utility consistently across projects for CI optimization
- **Cross-Platform Support**: Enhanced cross-platform compatibility measures
- **TypeScript Strict Mode**: All projects should use strict TypeScript configuration
- **Import Organization**: Separate type imports from runtime imports for better tree-shaking

## 🎯 Your Role
You are a **Principal Software Engineer** responsible for:
- Writing production-quality, maintainable code
- Making architectural decisions with long-term impact in mind
- Ensuring code follows established patterns and conventions
- Mentoring through code examples and best practices
- Prioritizing system reliability, performance, and developer experience
- Taking ownership of technical decisions and their consequences

## Important Project-Specific Rules

### 1. File Deletion Safety
- **🚨 DEPRECATED**: Direct `trash` usage is superseded by `safeRemove` utility (see section 1.6)
- **Registry/lib code**: Use native fs.rm for performance-critical operations
- **All other code**: Use `safeRemove` utility for safe deletion with CI optimizations

### 1.5. Performance Critical Operations
- This registry serves Socket's security analysis infrastructure
- Optimize for speed without sacrificing correctness in package processing
- Benchmark performance-sensitive changes against existing baselines
- Avoid unnecessary allocations in hot paths

### 1.6. Safe File Removal Pattern
- **🚨 MANDATORY**: Use `safeRemove` from `scripts/utils/fs.mjs` for ALL file deletion operations
- **Reference Implementation**: Socket-registry contains the canonical implementation for all Socket projects
- **Behavior**:
  - **Non-CI**: Uses trash for safety, falls back to fs.rm if trash fails
  - **CI**: Skips trash for performance, uses fs.rm directly
  - **Temp directories**: Silently ignores failures (system cleanup will handle them)
- **Usage**: `import { safeRemove } from './scripts/utils/fs.mjs'` then `await safeRemove(paths, options)`
- **❌ FORBIDDEN**: Direct use of `trash()`, `fs.rm()`, `fs.rmSync()`, or `rm -rf` commands
- **Cross-project**: Other Socket projects should copy and adapt this implementation

### 2. Node.js Version Compatibility
- **Minimum Version**: Node.js 18.0.0 (as specified in package.json engines)
- **🚨 MANDATORY**: All code MUST be compatible with Node.js 18+
- **ES2023+ Features**: Avoid features not available in Node.js 18
  - ❌ FORBIDDEN: `Array.prototype.toReversed()` (ES2023 - requires Node.js 20+)
  - ❌ FORBIDDEN: `Array.prototype.toSorted()` (ES2023 - requires Node.js 20+)
  - ❌ FORBIDDEN: `Array.prototype.toSpliced()` (ES2023 - requires Node.js 20+)
  - ❌ FORBIDDEN: `Array.prototype.with()` (ES2023 - requires Node.js 20+)
  - ✅ CORRECT: Use `array.slice().reverse()` instead of `array.toReversed()`
  - ✅ CORRECT: Use `array.slice().sort()` instead of `array.toSorted()`
- **Verification**: Test features against Node.js 18 compatibility before using

### 3. Package Manager Agent
- `registry/lib/agent.js` (formerly npm.js) handles npm, pnpm, and yarn
- Supports both Windows and Unix platforms
- `execNpm`, `execPnpm`, `execYarn` functions available
- Bin path resolution works across different installation methods

### 4. Cross-Platform Compatibility - CRITICAL: Windows and POSIX
- **🚨 MANDATORY**: Tests and functionality MUST work on both POSIX (macOS/Linux) and Windows systems
- **Path handling**: ALWAYS use `path.join()`, `path.resolve()`, `path.sep` for file paths
  - ❌ WRONG: `'/usr/local/bin/npm'` (hard-coded POSIX path)
  - ✅ CORRECT: `path.join(path.sep, 'usr', 'local', 'bin', 'npm')` (cross-platform)
  - ❌ WRONG: `'/project/package-lock.json'` (hard-coded forward slashes)
  - ✅ CORRECT: `path.join('project', 'package-lock.json')` (uses correct separator)
- **Temp directories**: Use `os.tmpdir()` for temporary file paths in tests
  - ❌ WRONG: `'/tmp/test-project'` (POSIX-specific)
  - ✅ CORRECT: `path.join(os.tmpdir(), 'test-project')` (cross-platform)
  - **Unique temp dirs**: Use `fs.mkdtemp()` or `fs.mkdtempSync()` for collision-free directories
  - ✅ PREFERRED: `await fs.mkdtemp(path.join(os.tmpdir(), 'socket-test-'))` (async)
  - ✅ ACCEPTABLE: `fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))` (sync)
- **Path separators**: Never hard-code `/` or `\` in paths
  - Use `path.sep` when you need the separator character
  - Use `path.join()` to construct paths correctly
- **File URLs**: Use `pathToFileURL()` and `fileURLToPath()` from `node:url` when working with file:// URLs
  - ❌ WRONG: `path.dirname(new URL(import.meta.url).pathname)` (Windows path doubling)
  - ✅ CORRECT: `path.dirname(fileURLToPath(import.meta.url))` (cross-platform)
- **Line endings**: Be aware of CRLF (Windows) vs LF (Unix) differences when processing text files
- **Shell commands**: Consider platform differences in shell commands and utilities

### 5. Testing
- Always run lint and typecheck before committing:
  - `pnpm run lint`
  - `pnpm run typecheck`
- Run tests with: `pnpm test`
- Pre-commit hooks will run automatically

### 6. Git Workflow
- **DO NOT commit automatically** - let the user review changes first
- **Pre-commit quality checks**: 🚨 MANDATORY - Always run these commands before committing:
  - `pnpm run fix` - Fix linting and formatting issues
  - `pnpm run check` - Run all checks (lint, type-check, tests)
  - **Rationale**: Ensures code quality regardless of whether hooks run
- **--no-verify usage**: Use `--no-verify` flag for commits that don't require pre-commit hooks
  - ✅ **Safe to skip hooks**: Scripts (scripts/), GitHub Actions workflows (.github/workflows/), tests (test/), documentation (*.md), configuration files
  - ❌ **Always run hooks**: Library code (registry/lib/), published packages (packages/npm/)
  - **Important**: Even when using `--no-verify`, you MUST still run `pnpm run fix` and `pnpm run check` manually first
  - **Rationale**: Pre-commit hooks run linting and type-checking which are critical for library and package code but less critical for non-published files
- **Commit message style**: Use conventional format without prefixes (feat:, fix:, chore:, etc.)
- **Message guidelines**: Keep commit messages short, pithy, and targeted - avoid lengthy explanations
- **Small commits**: Make small, focused commits that address a single concern
- **Version bump commits**: 🚨 MANDATORY - Version bump commits MUST use the format: `Bump to v<version-number>`
  - ✅ CORRECT: `Bump to v1.2.3`
  - ❌ WRONG: `chore: bump version`, `Update version to 1.2.3`, `1.2.3`
- **❌ FORBIDDEN**: Do NOT add Claude Code attribution footer to commit messages
  - ❌ WRONG: Including "🤖 Generated with [Claude Code](https://claude.ai/code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>"
  - ✅ CORRECT: Clean commit messages without attribution footers

### 7. Package Management
- **Package Manager**: This project uses pnpm (not npm)
- **Install dependencies**: `pnpm install`
- **Add dependency**: `pnpm add <package> --save-exact`
- **Add dev dependency**: `pnpm add -D <package> --save-exact`
- **Update dependencies**: `pnpm update`
- **Workspace root**: Use `-w` flag when adding packages to workspace root
- **🚨 MANDATORY**: Always add dependencies with exact versions using `--save-exact` flag to ensure reproducible builds
- **Dependency validation**: All dependencies MUST be pinned to exact versions without range specifiers like `^` or `~`
- **Script execution**: Always use `pnpm run <script>` for package.json scripts to distinguish from built-in pnpm commands
  - ✅ CORRECT: `pnpm run build`, `pnpm run test`, `pnpm run check`
  - ❌ AVOID: `pnpm build`, `pnpm test` (unclear if built-in or script)
- **README installation examples**: 🚨 MANDATORY - All package installation examples in README.md files MUST use `pnpm install` instead of `npm install`
  - ✅ CORRECT: `pnpm install @socketregistry/package-name`
  - ❌ WRONG: `npm install @socketregistry/package-name`
  - **Rationale**: Maintain consistency with project's chosen package manager across all documentation

### 8. Code Style
- Follow existing patterns in the codebase
- Don't add comments unless specifically requested
- Maintain consistency with surrounding code
- Use existing utilities from registry/lib where available
- **Dynamic imports**: Only use dynamic imports for test mocking (e.g., `vi.importActual` in Vitest). Avoid runtime dynamic imports in production code

### 9. Error Handling
- Scripts should use trash for safer deletion
- Provide fallback behavior when optional dependencies aren't available
- Use try-catch blocks for resilient code

#### Error Message Format & Style (Socket Standard)
- **Catch parameters**: 🚨 MANDATORY - Use `catch (e)` not `catch (error)`
- **JSDoc documentation**: Include `@throws {ErrorType} When condition occurs.` in function documentation
- **Component references**: Use double quotes around component/field names in error messages
  - ✅ CORRECT: `"config" field is required`
  - ❌ WRONG: `'config' field is required`
- **Quote characters**: Consistently use double quotes for literal values in error messages
- **Descriptive messages**: Error messages must clearly state what's wrong and which component failed

#### Error Message Patterns (Socket Standard)
Use these standardized patterns for consistency across all Socket projects:
- **Required fields**: `"{field}" is required` or `"{field}" is a required {type}`
- **Invalid types**: `"{field}" must be a {type}`
- **Validation failures**: `{context} "{field}" {violation}`
  - Example: `config "apiKey" cannot be empty`
- **Parse failures**: `failed to parse {format}` or `unable to {action} "{component}"`
- **Character restrictions**: Use specific descriptions: `cannot start with`, `cannot contain`, `must start with`

#### Error Handling Requirements (Socket Standard)
- **Descriptive and actionable**: Errors must clearly state what's wrong and provide context
- **Input validation**: Validate inputs thoroughly before processing
- **Edge cases**: Handle edge cases gracefully with clear error messages
- **Error context**: Include `{ cause: e }` when wrapping underlying errors
- **No process.exit()**: Never use `process.exit(1)` - throw errors instead (except script entry points where appropriate)
- **No silent failures**: Never use `logger.error()` or `console.error()` followed by `return` - throw proper errors
- **Test error paths**: Test both success and error paths for comprehensive coverage

### 10. Test Coverage
- All `c8 ignore` comments MUST include a reason why the code is being ignored
- All c8 ignore comments MUST end with periods for consistency
- Format: `// c8 ignore start - Reason for ignoring.`
- Example: `// c8 ignore start - Internal helper functions not exported.`
- This helps maintain clarity about why certain code paths aren't tested

## 📋 Code Style (MANDATORY PATTERNS)

### 📁 File Organization & Imports

#### File Structure
- **File extensions**: `.js` for JavaScript with JSDoc, `.mjs` for ES modules
- **Naming**: kebab-case for filenames
- **TypeScript types**: Always export options and return types for better developer experience
- **Module headers**: 🚨 MANDATORY - All modules MUST have `@fileoverview` headers as first content
  - Format: `/** @fileoverview Brief description of module purpose. */`
  - Placement: Before `'use strict'` or imports
  - ✅ CORRECT: `/** @fileoverview Package manager agent utilities. */`
  - ❌ FORBIDDEN: Missing header or placed after imports

#### Import Organization
- **Node.js imports**: 🚨 MANDATORY - Always use `node:` prefix
  - ✅ CORRECT: `import path from 'node:path'`
  - ❌ FORBIDDEN: `import path from 'path'`
- **Import patterns**: Avoid `import * as` except in re-export wrappers
  - ✅ CORRECT: `import semver from './external/semver'` or `import { parse } from 'semver'`
  - ❌ AVOID: `import * as semver from 'semver'`
- **fs imports**: Use pattern `import { syncMethod, promises as fs } from 'node:fs'`

#### Import Statement Sorting
- **🚨 MANDATORY**: Sort imports in this exact order with blank lines between groups (enforced by ESLint import-x/order):
  1. Node.js built-in modules (with `node:` prefix) - sorted alphabetically
  2. External third-party packages - sorted alphabetically
  3. Internal Socket packages (`@socketsecurity/*`) - sorted alphabetically
  4. Local/relative imports (parent, sibling, index) - sorted alphabetically
  5. **Type imports LAST as separate group** - sorted alphabetically (all `import type` statements together at the end)
- **Within each group**: Sort alphabetically by module name
- **Named imports**: Sort named imports alphabetically within the import statement (enforced by sort-imports)
- **Type import placement**: Type imports must come LAST, after all runtime imports, as a separate group with blank line before
- **Examples**:
  - ✅ CORRECT:
    ```typescript
    import { readFile } from 'node:fs'
    import path from 'node:path'
    import { promisify } from 'node:util'

    import axios from 'axios'
    import semver from 'semver'

    import { readPackageJson } from '@socketsecurity/registry/lib/packages'
    import { spawn } from '@socketsecurity/registry/lib/spawn'

    import { API_BASE_URL } from './constants'
    import { formatError, parseResponse } from './utils'

    import type { ClientRequest, IncomingMessage } from 'node:http'
    import type { PackageJson } from '@socketsecurity/registry/lib/packages'
    import type { Config } from './types'
    ```
  - ❌ WRONG:
    ```typescript
    import { formatError, parseResponse } from './utils'
    import axios from 'axios'
    import type { Config } from './types'
    import { readFile } from 'node:fs'
    import { spawn } from '@socketsecurity/registry/lib/spawn'
    import semver from 'semver'
    import type { PackageJson } from '@socketsecurity/registry/lib/packages'
    ```

### 🏗️ Code Structure & Patterns

#### Naming Conventions
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `CMD_NAME`, `MAX_RETRIES`)
- **Variables/Functions**: `camelCase`
- **Classes/Types**: `PascalCase`

#### TypeScript Patterns
- **Class properties**: When extending third-party classes, use `declare` for inherited properties
  - ✅ CORRECT: `class MyClass extends ThirdPartyClass { declare isSpinning: boolean }`
  - ❌ WRONG: Using bracket notation like `this['isSpinning']` to avoid type errors
- **Type safety**: 🚨 FORBIDDEN - Avoid `any` type; prefer `unknown` or specific types
- **Loop annotations**: 🚨 FORBIDDEN - Never annotate for...of loop variables
  - ✅ CORRECT: `for await (const chunk of stream)`
  - ❌ FORBIDDEN: `for await (const chunk: Buffer of stream)`

#### Return Value Pattern
- **🚨 MANDATORY**: Use `undefined` instead of `null` for absent values
  - ✅ CORRECT: `return undefined` when no value exists
  - ✅ CORRECT: `return result || undefined`
  - ❌ FORBIDDEN: `return null` for absent values
  - Exception: Only use `null` when interfacing with external APIs (e.g., JSON.parse, process.exitCode)

#### Object & Array Patterns
- **Object literals with __proto__**: 🚨 MANDATORY - `__proto__: null` ALWAYS comes first in object literals
  - ✅ CORRECT: `const MAP = { __proto__: null, foo: 'bar', baz: 'qux' }`
  - ✅ CORRECT: `{ __proto__: null, ...options }`
  - ❌ FORBIDDEN: `{ foo: 'bar', __proto__: null }` (wrong order)
  - ❌ FORBIDDEN: `{ ...options, __proto__: null }` (wrong order)
  - Use `Map` for dynamic collections
- **Array destructuring**: Use object notation for tuple access
  - ✅ CORRECT: `{ 0: key, 1: data }`
  - ❌ AVOID: `[key, data]`
- **Array destructuring performance**: For `Object.entries()` loops, use object destructuring for better V8 performance
  - ❌ SLOWER: `for (const [key, value] of Object.entries(obj))`
  - ✅ FASTER: `for (const { 0: key, 1: value } of Object.entries(obj))`
  - **Rationale**: Array destructuring requires iterator protocol (per ECMAScript spec), while object destructuring directly accesses indexed properties
  - **Reference**: https://stackoverflow.com/a/66321410 (V8 developer explanation)
  - **Trade-off**: This is a microbenchmark optimization - prioritize readability unless profiling shows this is a bottleneck
- **Array checks**: Use `!array.length` instead of `array.length === 0`
- **Destructuring**: Sort properties alphabetically in const declarations

#### Function Patterns
- **Ordering**: Alphabetical order; private functions first, then exported
- **Options parameter**: 🚨 MANDATORY pattern for all functions with options:
  ```typescript
  function foo(a: SomeA, options?: SomeOptions | undefined): Result {
    const opts = { __proto__: null, ...options } as SomeOptions
    // OR with destructuring:
    const { retries = 3 } = { __proto__: null, ...options } as SomeOptions
  }
  ```
  - Must be optional (`?`) and typed `| undefined`
  - Must use `{ __proto__: null, ...options }` pattern
  - Must include `as SomeOptions` type assertion
  - TypeScript doesn't recognize `__proto__: null` in interfaces; ALWAYS use type assertion
  - This pattern is critical for security and MUST NOT be removed
- **Error handling**: Use try-catch blocks; handle errors gracefully
- **Process spawning**: 🚨 FORBIDDEN - Don't use `child_process.spawn`; use `@socketsecurity/registry/lib/spawn`
- **Increment operators**: Use `variable += 1` instead of `variable++` for standalone statements
  - Keep `++` only within expressions or when return value is needed

### 📝 Comments & Documentation

#### Comment Style
- **Preference**: Single-line (`//`) over multiline (`/* */`) except for headers
- **Periods**: 🚨 MANDATORY - All comments end with periods (except directives and URLs)
- **Placement**: Own line above code, never trailing
- **Sentence structure**: Complete sentences with proper capitalization
- **Style**: Use commas/colons/semicolons instead of excessive hyphens
- **Examples**:
  - ✅ CORRECT: `// This validates user input.`
  - ✅ CORRECT: `// eslint-disable-next-line no-await-in-loop` (directive, no period)
  - ✅ CORRECT: `// See https://example.com` (URL, no period)
  - ✅ CORRECT: `// c8 ignore start - Not exported.` (reason has period)
  - ❌ WRONG: `// this validates input` (no period, not capitalized)
  - ❌ WRONG: `const x = 5 // some value` (trailing)

#### JSDoc Documentation
- **Function docs**: Description only with optional `@throws`
  - ✅ CORRECT:
    ```javascript
    /**
     * Parse configuration and validate contents.
     * @throws {Error} When file cannot be read.
     */
    ```
  - ❌ FORBIDDEN: `@param`, `@returns`, `@author`, `@since`, `@example` tags
  - ❌ FORBIDDEN: Empty lines between tags
- **Test coverage**: All `c8 ignore` comments MUST include reason ending with period
  - Format: `// c8 ignore start - Reason for ignoring.`

### 🔧 Code Organization

#### Control Flow
- **If statements**: Never single-line returns; always use braces
- **Await in loops**: Add `// eslint-disable-next-line no-await-in-loop` when intentional
- **Existence checks**: Perform simple checks before complex operations

#### Data & Collections
- **Mapping constants**: Move outside functions as module-level `UPPER_SNAKE_CASE` constants
- **Sorting**: 🚨 MANDATORY - Sort lists, exports, and items alphabetically
- **Catch parameters**: Use `catch (e)` not `catch (error)`
- **Number formatting**: Use underscore separators for large numbers (e.g., `20_000`)
  - 🚨 FORBIDDEN - Don't modify numbers inside strings

#### Formatting Standards
- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes preferred
- **Semicolons**: Omit semicolons
- **Line length**: Target 80 characters where practical
- **List formatting**: Use `-` for bullets, not `•`

## Commands

### Development Commands
- **Build**: `pnpm run build` (builds registry)
- **Test**: `pnpm run test` (runs check + all tests)
- **Test unit only**: `pnpm run test:unit`
- **Test npm packages**: `pnpm run test:npm:packages` (⚠️ Takes a long time to complete - tests all npm package overrides. Note: The setup phase includes package installation, Socket override application, and dependency installation which may take several minutes per package and affect timeout considerations)
- **Test pre-commit**: `pnpm run test-pre-commit`
- **Lint**: `pnpm run check:lint` (uses eslint)
- **Type check**: `pnpm run check:tsc`
- **Check all**: `pnpm run check` (runs all checks in parallel)
- **Fix linting**: `pnpm run lint:fix`

### Registry Management Commands
- **Update packages**: `pnpm run update` (updates all packages and metadata)
- **Update empty dirs**: `pnpm run update:empty-dirs`
- **Update licenses**: `pnpm run update:licenses`
- **Update manifest**: `pnpm run update:manifest`
- **Make npm override**: `pnpm run make:npm-override`
- **Release packages**: `pnpm run release:npm`

### Workspace Commands
```bash
# Add a dev dependency to workspace root (exact version)
pnpm add -D -w package-name@version --save-exact

# Add dependency to scripts package
pnpm add package-name --filter @socketregistry/scripts

# Clean build artifacts
pnpm run clean

# Run specific test
pnpm run test:unit -- path/to/test
```

## Project Structure

- `/registry/lib/` - Core library code (production)
- `/scripts/` - Development and build scripts
- `/test/` - Test files
- `/packages/npm/` - NPM package overrides

### Test Directory Structure
- **Test directory structure**: 🚨 MANDATORY - Standardize test directory organization across all Socket projects:
  ```
  test/
  ├── unit/                   # Unit tests
  ├── integration/           # Integration tests (if applicable)
  ├── fixtures/              # Test fixtures and data files
  └── utils/                 # Test utilities and helpers
  ```
- **Test fixtures**: Store reusable test data, mock responses, and sample files in `test/fixtures/` directory
  - **Organization**: Group fixtures by test category or functionality
  - **File formats**: Support JSON, text, binary files as needed for comprehensive testing
  - **Naming**: Use descriptive names that clearly indicate the fixture's purpose

## Changelog Management

When updating the changelog (`CHANGELOG.md`):
- Version headers should be formatted as markdown links to GitHub releases
- Use the format: `## [version](https://github.com/SocketDev/socket-registry/releases/tag/vversion) - date`
- Example: `## [1.2.2](https://github.com/SocketDev/socket-registry/releases/tag/v1.2.2) - 2025-01-15`
- This allows users to click version numbers to view the corresponding GitHub release

### Keep a Changelog Compliance
Follow the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format:
- Use standard sections: Added, Changed, Fixed, Removed (Security if applicable)
- Maintain chronological order with latest version first
- Include release dates in YYYY-MM-DD format
- Make entries human-readable, not machine diffs
- Focus on notable changes that impact users

## 🔧 Git & Workflow

### GitHub Actions Guidelines
- **🚨 MANDATORY**: All GitHub Actions MUST reference commit SHAs, not version tags
- **Security requirement**: SocketDev repositories require pinned commit hashes for supply chain security
- **🚨 MANDATORY**: Reusable workflows MUST be created in `socket-registry/.github/workflows/`, NOT in individual project repositories
- **Workflow location**: Individual projects should reference workflows from `SocketDev/socket-registry/.github/workflows/`
- **Standard action SHAs** (keep these updated across all Socket projects):
  - `actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8` (v5.0.0)
  - `pnpm/action-setup@a7487c7e89a18df4991f7f222e4898a00d66ddda` (v4.1.0)
  - `actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444` (v5.0.0)
  - `actions/upload-artifact@50769540e7f4bd5e21e526ee35c689e35e0d6874` (v4.4.0)
- **Format**: Always include version comment: `uses: owner/repo@sha # vX.Y.Z`
- **Examples**:
  - ✅ CORRECT: `uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v5.0.0`
  - ✅ CORRECT: `uses: SocketDev/socket-registry/.github/workflows/test.yml@main`
  - ❌ FORBIDDEN: `uses: actions/checkout@v4` or `uses: actions/checkout@v5`
  - ❌ FORBIDDEN: `uses: ./.github/workflows/_reusable-test.yml` (reusable workflows belong in socket-registry)
- **Allowed actions**: Either SocketDev-owned or pinned by SHA from trusted sources
- **Cross-project consistency**: Maintain identical SHAs across all Socket projects

### CI Workflow Strategy
- **🚨 MANDATORY**: Use the centralized `ci.yml` reusable workflow from socket-registry
- **Workflow location**: `SocketDev/socket-registry/.github/workflows/ci.yml@main`
- **Benefits**: Consistent CI strategy across all Socket projects, parallel execution of lint/type-check/test/coverage
- **Configuration**: Customize via workflow inputs (scripts, node versions, OS versions, timeouts, etc.)
- **Standard configuration pattern**:
  ```yaml
  jobs:
    ci:
      name: Run CI Pipeline
      uses: SocketDev/socket-registry/.github/workflows/ci.yml@main
      with:
        coverage-script: 'pnpm run test:unit:coverage'
        coverage-report-script: 'pnpm run coverage:percent --json'
        fail-fast: false
        lint-script: 'pnpm run lint-ci'
        node-versions: '[20, 22, 24]'
        os-versions: '["ubuntu-latest", "windows-latest"]'
        test-script: 'pnpm run test-ci'
        test-setup-script: 'pnpm run build'
        type-check-script: 'pnpm run type-ci'
        type-check-setup-script: 'pnpm run build'
  ```
- **Orchestration**: CI workflow orchestrates lint.yml, types.yml, test.yml, and coverage reporting
- **Individual workflows**: Keep lint.yml, types.yml, test.yml for targeted runs; ci.yml runs all together
- **Cross-project consistency**: All Socket projects should use identical CI orchestration pattern

#### CI Script Naming Convention (MANDATORY)
All Socket projects MUST use these standardized script names in package.json:
- **lint-ci**: Linting for CI environments
  - Format: `"lint-ci": "pnpm run check:lint"`
  - Purpose: Run linting checks without fixing, optimized for CI
- **test-ci**: Testing for CI environments
  - Format: `"test-ci": "dotenvx -q run -f .env.test -- vitest run"`
  - Purpose: Run tests without watch mode, optimized for CI
  - MUST NOT include linting or building (handled separately)
- **type-ci**: Type checking for CI environments
  - Format: `"type-ci": "pnpm run check:tsc"`
  - Purpose: Run TypeScript type checking without emitting files

**Why standardized names:**
- Consistent CI configuration across all Socket projects
- Clear separation of concerns (lint/test/type-check run independently)
- Easier to maintain and update CI workflows
- Reduces duplicate work (no linting in test-ci, no building twice)

## Architecture

This is a monorepo for Socket.dev optimized package overrides, built with JavaScript and managed with pnpm workspaces.

### Core Structure
- **Registry library**: `/registry/lib/` - Core library code (production)
- **Scripts**: `/scripts/` - Development and build scripts
- **Tests**: `/test/` - Test files and fixtures
- **Package overrides**: `/packages/npm/` - NPM package overrides

### Build System
- Uses Rollup for building external dependencies
- TypeScript support with tsconfig (compiles to CommonJS)
- Post-build script fixes CommonJS exports for backward compatibility
- Multiple environment configs (.env.local, .env.test, .env.external)
- Dual linting with oxlint and eslint
- Formatting with Biome

#### CommonJS Export Compatibility (CRITICAL)
- **Issue**: TypeScript compiles `export default` to `exports.default = value`, requiring `.default` in CommonJS
- **Solution**: Post-build script `registry/scripts/fix-commonjs-exports.mjs` transforms exports
- **Result**: Direct CommonJS require works: `require('@socketsecurity/registry/lib/constants/WIN32')` returns value directly
- **Implementation**:
  - Constants use `export default` in TypeScript for consistency
  - Post-build transforms `exports.default = value` → `module.exports = value`
  - Also fixes imports in other compiled files to remove `.default` references
  - Files with type exports keep default export pattern
- **Maintenance**: Script runs automatically as part of build process (`build:fix-cjs`)

### Testing
- Vitest for unit testing
- Test files use `.test.mts` extension (migrated from .test.ts)
- Fixtures in `test/fixtures/`
- Pre-commit hooks for quality assurance

#### Vitest Memory Optimization (CRITICAL)
- **Pool configuration**: Use `pool: 'forks'` with `singleFork: true`, `maxForks: 1`, `isolate: true`
- **Memory limits**: Set `NODE_OPTIONS="--max-old-space-size=4096 --max-semi-space-size=512"` in `.env.test`
- **Timeout settings**: Use `testTimeout: 60_000, hookTimeout: 60_000` for stability
- **Thread limits**: Use `singleThread: true, maxThreads: 1` to prevent RegExp compiler exhaustion
- **Test cleanup**: 🚨 MANDATORY - Use `await safeRemove(paths)` for all test cleanup operations

### 🗑️ Safe File Operations (SECURITY CRITICAL)
- **🚨 MANDATORY**: Use `safeRemove` utility from `scripts/utils/fs.mjs` for ALL file deletion operations
- **Import and usage**: `import { safeRemove } from './scripts/utils/fs.mjs'` then `await safeRemove(paths, options)`
- **CI Optimized**: Automatically skips trash in CI for performance, uses fs.rm directly
- **Temp directory aware**: Silently ignores failures for temp paths (system cleanup handles them)
- **Array support**: Accepts single paths or arrays of paths
- **Async requirement**: Always `await safeRemove()` - it's an async operation
- **🚨 ABSOLUTELY FORBIDDEN**: Direct use of `fs.rmSync()`, `fs.rm()`, `trash()`, or `rm -rf` commands
- **Examples**:
  - ❌ CATASTROPHIC: `rm -rf directory` (permanent deletion - DATA LOSS RISK)
  - ❌ REPOSITORY DESTROYER: `rm -rf "$(pwd)"` (deletes entire repository)
  - ❌ FORBIDDEN: `fs.rmSync(tmpDir, { recursive: true, force: true })` (no safety)
  - ❌ FORBIDDEN: `await trash([tmpDir])` (no CI optimization)
  - ✅ SAFE: `await safeRemove(tmpDir)` or `await safeRemove([tmpDir1, tmpDir2])`
- **Why this matters**: Provides recovery via system trash while optimizing CI performance

## Environment and Configuration

### Environment Files
- **`.env.local`** - Local development environment
- **`.env.test`** - Test environment configuration
- **`.env.precommit`** - Pre-commit test environment
- **`.env.external`** - External dependencies environment

### Configuration Files
- **`biome.json`** - Biome formatter and linter configuration
- **`vitest.config.js`** - Vitest test runner configuration
- **`eslint.config.js`** - ESLint configuration
- **`tsconfig.json`** - TypeScript configuration
- **`.oxlintrc.json`** - Oxlint configuration
- **`knip.json`** - Knip unused code detection configuration

---

# 🚨 CRITICAL BEHAVIORAL REQUIREMENTS

## 🔍 Pre-Action Protocol
- **🚨 MANDATORY**: Before taking ANY action, ALWAYS review and verify compliance with CLAUDE.md guidelines
- **Check before you act**: Read relevant sections of this file to ensure your approach follows established patterns
- **No exceptions**: This applies to all tasks, including code changes, commits, documentation, testing, and file operations
- **When in doubt**: If unclear about the right approach, consult CLAUDE.md first before proceeding

## 🎯 Principal Engineer Mindset
- Act with the authority and expertise of a principal-level software engineer
- Make decisions that prioritize long-term maintainability over short-term convenience
- Anticipate edge cases and potential issues before they occur
- Write code that other senior engineers would be proud to review
- Take ownership of technical decisions and their consequences

## 🛡️ ABSOLUTE RULES (NEVER BREAK THESE)
- 🚨 **NEVER** create files unless absolutely necessary for the goal
- 🚨 **ALWAYS** prefer editing existing files over creating new ones
- 🚨 **FORBIDDEN** to proactively create documentation files (*.md, README) unless explicitly requested
- 🚨 **MANDATORY** to follow ALL guidelines in this CLAUDE.md file without exception
- 🚨 **REQUIRED** to do exactly what was asked - nothing more, nothing less

## 🎯 Quality Standards
- Code MUST pass all existing lints and type checks
- Changes MUST maintain backward compatibility unless explicitly breaking changes are requested
- All patterns MUST follow established codebase conventions
- Error handling MUST be robust and user-friendly
- Performance considerations MUST be evaluated for any changes

## 📋 Recurring Patterns & Instructions

These are patterns and instructions that should be consistently applied across all Socket projects:

### 🏗️ Mandatory Code Patterns
1. **__proto__ Ordering**: 🚨 MANDATORY - `__proto__: null` ALWAYS comes first in object literals (e.g., `{ __proto__: null, ...options }`, never `{ ...options, __proto__: null }`)
2. **Options Parameter Pattern**: Use `{ __proto__: null, ...options } as SomeOptions` for all functions accepting options
3. **Reflect.apply Pattern**: Use `const { apply: ReflectApply } = Reflect` and `ReflectApply(fn, thisArg, [])` instead of `.call()` for method invocation
4. **Object Mappings**: Use `{ __proto__: null, ...mapping }` for static string-to-string mappings to prevent prototype pollution
5. **Import Separation**: ALWAYS separate type imports (`import type`) from runtime imports
6. **Node.js Imports**: ALWAYS use `node:` prefix for Node.js built-in modules
7. **🚨 TSGO PRESERVATION**: NEVER replace tsgo with tsc - tsgo provides enhanced performance and should be maintained across all Socket projects

### 🧪 Test Patterns & Cleanup
1. **Remove Duplicate Tests**: Eliminate tests that verify the same functionality across multiple files
2. **Centralize Test Data**: Use shared test fixtures instead of hardcoded values repeated across projects
3. **Focus Test Scope**: Each project should test its specific functionality, not dependencies' core features

### 🔄 Cross-Project Consistency
These patterns should be enforced across all Socket repositories:
- `socket-cli`
- `socket-packageurl-js`
- `socket-registry`
- `socket-sdk-js`

When working in any Socket repository, check CLAUDE.md files in other Socket projects for consistency and apply these patterns universally.

## 📦 Dependency Alignment Standards (CRITICAL)

### 🚨 MANDATORY Dependency Management
All Socket projects MUST maintain alignment on these core dependencies. Use `taze` for version management - run `pnpm run taze` to check for and apply dependency updates.

#### Core Build Tools & TypeScript
- **@typescript/native-preview** (tsgo - NEVER use standard tsc)
- **@types/node** (latest LTS types)
- **typescript-eslint** (unified package - do NOT use separate @typescript-eslint/* packages)

#### Essential DevDependencies
- **@biomejs/biome**
- **@dotenvx/dotenvx**
- **@eslint/compat**
- **@eslint/js**
- **@vitest/coverage-v8**
- **eslint**
- **eslint-plugin-import-x**
- **eslint-plugin-n**
- **eslint-plugin-sort-destructure-keys**
- **eslint-plugin-unicorn**
- **globals**
- **husky**
- **knip**
- **lint-staged**
- **npm-run-all2**
- **oxlint**
- **taze**
- **trash**
- **type-coverage**
- **vitest**
- **yargs-parser**
- **yoctocolors-cjs**

### 🔧 TypeScript Compiler Standardization
- **🚨 MANDATORY**: ALL Socket projects MUST use `tsgo` instead of `tsc`
- **Package**: `@typescript/native-preview`
- **Scripts**: Replace `tsc` with `tsgo` in all package.json scripts
- **Benefits**: Enhanced performance, better memory management, faster compilation

#### Script Examples:
```json
{
  "build": "tsgo",
  "check:tsc": "tsgo --noEmit",
  "build:types": "tsgo --project tsconfig.dts.json"
}
```

### 🛠️ ESLint Configuration Standardization
- **🚨 FORBIDDEN**: Do NOT use separate `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` packages
- **✅ REQUIRED**: Use unified `typescript-eslint` package only
- **Migration**: Remove separate packages, add unified package

#### Migration Commands:
```bash
pnpm remove @typescript-eslint/eslint-plugin @typescript-eslint/parser
pnpm add -D typescript-eslint --save-exact
```

### 📋 Dependency Update Requirements
When updating dependencies across Socket projects:

1. **Use taze first**: Run `pnpm run taze` to check for and apply dependency updates
2. **Version Consistency**: All projects MUST use identical versions for shared dependencies
3. **Exact Versions**: Always use `--save-exact` flag to prevent version drift
4. **Batch Updates**: Update all Socket projects simultaneously to maintain alignment
5. **Testing**: Run full test suites after dependency updates to ensure compatibility
6. **Documentation**: Update CLAUDE.md files when standard versions change

### 🔄 Regular Maintenance
- **Monthly Audits**: Review dependency versions across all Socket projects
- **Security Updates**: Apply security patches immediately across all projects
- **Major Version Updates**: Coordinate across projects, test thoroughly
- **Legacy Cleanup**: Remove unused dependencies during regular maintenance

### 🚨 Enforcement Rules
- **Pre-commit Hooks**: Configure to prevent commits with misaligned dependencies
- **CI/CD Integration**: Fail builds on version mismatches
- **Code Reviews**: Always verify dependency alignment in PRs
- **Documentation**: Keep this section updated with current standard versions

This standardization ensures consistency, reduces maintenance overhead, and prevents dependency-related issues across the Socket ecosystem.

## Notes

- The project maintains a registry of NPM packages with security-focused modifications
- Be careful with file operations - prefer moving to trash over permanent deletion in scripts
- The codebase supports multiple package managers (npm, pnpm, yarn)
- Windows compatibility is important - test path handling carefully
- Always run lint and typecheck before committing
