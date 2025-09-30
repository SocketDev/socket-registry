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
- Use `--no-verify` flag only when explicitly requested
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

### 10. Test Coverage
- All `c8 ignore` comments MUST include a reason why the code is being ignored
- All c8 ignore comments MUST end with periods for consistency
- Format: `// c8 ignore start - Reason for ignoring.`
- Example: `// c8 ignore start - Internal helper functions not exported.`
- This helps maintain clarity about why certain code paths aren't tested

## 📋 Code Style (MANDATORY PATTERNS)

### 📁 File Organization
- **File extensions**: Use `.js` for JavaScript files with JSDoc, `.mjs` for ES modules
- **TypeScript types**: Always export options and return types for better developer experience and type safety
- **Module headers**: 🚨 MANDATORY - All JavaScript modules MUST have `@fileoverview` headers
  - **Format**: Use `/** @fileoverview Brief description of module purpose. */` at the top of each file
  - **Placement**: Must be the very first content in the file, before `'use strict'` or imports
  - **Content**: Provide a concise, clear description of what the module does and its primary purpose
  - **Examples**:
    - ✅ CORRECT: `/** @fileoverview Package manager agent for executing npm, pnpm, and yarn commands. */`
    - ✅ CORRECT: `/** @fileoverview Array utility functions for formatting lists and collections. */`
    - ❌ FORBIDDEN: Missing @fileoverview header entirely
    - ❌ FORBIDDEN: Placing @fileoverview after imports or other code
- **JSDoc function documentation**: 🚨 MANDATORY - Function JSDoc comments MUST follow this exact pattern:
  - **Format**: Description only, with optional `@throws` - NO `@param` or `@returns` tags
  - **Order**: Description paragraph, then `@throws` tag (if needed)
  - **Closure**: End with `*/` immediately after the last JSDoc tag
  - **Examples**:
    - ✅ CORRECT:
      ```javascript
      /**
       * Check if a string contains a trusted domain using proper URL parsing.
       */
      ```
    - ✅ CORRECT (with throws):
      ```javascript
      /**
       * Parse a configuration file and validate its contents.
       * @throws {Error} When file cannot be read or parsed.
       */
      ```
    - ❌ FORBIDDEN: Adding `@param` or `@returns` tags
    - ❌ FORBIDDEN: Adding extra tags like `@author`, `@since`, `@example`, etc.
    - ❌ FORBIDDEN: Adding empty lines between JSDoc tags
    - ❌ FORBIDDEN: Adding extra content after the last JSDoc tag
- **Import order**: Node.js built-ins first, then third-party packages, then local imports
- **Import grouping**: Group imports by source (Node.js, external packages, local modules)
- **Node.js module imports**: 🚨 MANDATORY - Always use `node:` prefix for Node.js built-in modules
  - ✅ CORRECT: `import { readFile } from 'node:fs'`, `import path from 'node:path'`
  - ❌ FORBIDDEN: `import { readFile } from 'fs'`, `import path from 'path'`
- **Import patterns**: 🚨 MANDATORY - Avoid `import * as` pattern except when creating re-export wrappers
  - ✅ CORRECT: `import semver from './external/semver'` (default import)
  - ✅ CORRECT: `import { satisfies, gt, lt } from './external/semver'` (named imports)
  - ❌ AVOID: `import * as semver from './external/semver'` (namespace import - only use in external re-export files)
  - **Exception**: External wrapper files in `src/external/` may use `import * as` to create default exports

### 🔧 Formatting Rules
- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes for strings
- **Semicolons**: No semicolons
- **Variables**: Use camelCase for variables and functions

### 🏗️ Code Structure (CRITICAL PATTERNS)
- **TypeScript class property declarations**: When extending third-party classes without type definitions, use `declare` to properly type inherited properties
  - ✅ CORRECT: `class MyClass extends ThirdPartyClass { declare isSpinning: boolean }`
  - ❌ WRONG: Using bracket notation like `this['isSpinning']` to avoid type errors
- **Return values**: 🚨 MANDATORY - Use `undefined` instead of `null` for absent values. A value either exists (something) or doesn't exist (undefined). This simplifies type checking and prevents null/undefined confusion.
  - ✅ CORRECT: `return undefined` when no value exists
  - ✅ CORRECT: `return result || undefined` for optional returns
  - ❌ FORBIDDEN: `return null` for absent values
  - Exception: Only use `null` when interfacing with external APIs that explicitly require it (e.g., JSON.parse, process.exitCode)
- **Error handling**: REQUIRED - Use try-catch blocks and handle errors gracefully
- **Array destructuring**: Use object notation `{ 0: key, 1: data }` instead of array destructuring `[key, data]`
- **Comment formatting**: 🚨 MANDATORY - ALL comments MUST follow these rules:
  - **Single-line preference**: Prefer single-line comments (`//`) over multiline comments (`/* */`) unless for method headers, module headers, or copyright notices. Use single-line comments for property descriptions, inline explanations, and general code comments.
  - **Periods required**: Every comment MUST end with a period, except ESLint disable comments and URLs which are directives/references. This includes single-line, multi-line, inline, and c8 ignore comments.
  - **Sentence structure**: Comments should be complete sentences with proper capitalization and grammar.
  - **Placement**: Place comments on their own line above the code they describe, not trailing to the right of code.
  - **Style**: Use fewer hyphens/dashes and prefer commas, colons, or semicolons for better readability.
  - **Examples**:
    - ✅ CORRECT: `// Custom GitHub host (default: github.com).` (property description)
    - ❌ WRONG: `/** Custom GitHub host (default: github.com). */` (multiline for simple property)
    - ✅ CORRECT: `// This function validates user input.`
    - ✅ CORRECT: `/* This is a multi-line comment that explains the complex logic below. */`
    - ✅ CORRECT: `// eslint-disable-next-line no-await-in-loop` (directive, no period)
    - ✅ CORRECT: `// See https://example.com/docs` (URL reference, no period)
    - ✅ CORRECT: `// c8 ignore start - Reason for ignoring.` (explanation has period)
    - ❌ WRONG: `// this validates input` (no period, not capitalized)
    - ❌ WRONG: `const x = 5 // some value` (trailing comment)
- **Await in loops**: When using `await` inside for-loops, add `// eslint-disable-next-line no-await-in-loop` to suppress the ESLint warning when sequential processing is intentional
- **For...of loop type annotations**: 🚨 FORBIDDEN - Never use type annotations in for...of loop variable declarations. TypeScript cannot parse `for await (const chunk: Buffer of stream)` - use `for await (const chunk of stream)` instead and let TypeScript infer the type
- **If statement returns**: Never use single-line return if statements; always use proper block syntax with braces
- **List formatting**: Use `-` for bullet points in text output, not `•` or other Unicode characters, for better terminal compatibility
- **Existence checks**: Perform simple existence checks first before complex operations
- **Destructuring order**: Sort destructured properties alphabetically in const declarations
- **Function ordering**: Place functions in alphabetical order, with private functions first, then exported functions
- **Object mappings**: Use objects with `__proto__: null` (not `undefined`) for static string-to-string mappings and lookup tables to prevent prototype pollution; use `Map` for dynamic collections that will be mutated
- **Mapping constants**: Move static mapping objects outside functions as module-level constants with descriptive UPPER_SNAKE_CASE names
- **Array length checks**: Use `!array.length` instead of `array.length === 0`. For `array.length > 0`, use `!!array.length` when function must return boolean, or `array.length` when used in conditional contexts
- **Catch parameter naming**: Use `catch (e)` instead of `catch (error)` for consistency
- **Number formatting**: 🚨 REQUIRED - Use underscore separators (e.g., `20_000`) for large numeric literals. 🚨 FORBIDDEN - Do NOT modify number values inside strings
- **Node.js fs imports**: 🚨 MANDATORY pattern - `import { someSyncThing, promises as fs } from 'node:fs'`
- **Process spawning**: 🚨 FORBIDDEN to use Node.js built-in `child_process.spawn` - MUST use `spawn` from `@socketsecurity/registry/lib/spawn`
- **Increment operators**: Use `variable += 1` instead of `variable++` for standalone increment statements on their own line. Keep `++` only when used within expressions or when the return value is needed

### 🏗️ Function Options Pattern (MANDATORY)
- **🚨 REQUIRED**: ALL functions accepting options MUST follow this exact pattern:
  ```typescript
  function foo(a: SomeA, b: SomeB, options?: SomeOptions | undefined): FooResult {
    const opts = { __proto__: null, ...options } as SomeOptions
    // OR for destructuring with defaults:
    const { someOption = 'someDefaultValue' } = { __proto__: null, ...options } as SomeOptions
    // ... rest of function
  }
  ```
- **Key requirements**:
  - Options parameter MUST be optional with `?` and explicitly typed as `| undefined`
  - MUST use `{ __proto__: null, ...options }` pattern to prevent prototype pollution
  - MUST use `as SomeOptions` type assertion after spreading
  - Use destructuring form when you need defaults for individual options
  - Use direct assignment form when passing entire options object to other functions
- **TypeScript compatibility**:
  - TypeScript doesn't recognize `__proto__: null` as valid in object literals matching interfaces
  - ALWAYS use type assertion `as SomeOptions` to resolve TypeScript errors
  - This pattern is critical for security and MUST NOT be removed to satisfy TypeScript
- **Examples**:
  - ✅ CORRECT: `const opts = { __proto__: null, ...options } as SomeOptions`
  - ✅ CORRECT: `const { retries = 3, timeout = 5_000 } = { __proto__: null, ...options } as SomeOptions`
  - ❌ FORBIDDEN: `const opts = { ...options }` (vulnerable to prototype pollution)
  - ❌ FORBIDDEN: `const opts = options || {}` (doesn't handle null prototype)
  - ❌ FORBIDDEN: `const opts = Object.assign({}, options)` (inconsistent pattern)

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
1. **Options Parameter Pattern**: Use `{ __proto__: null, ...options } as SomeOptions` for all functions accepting options
2. **Reflect.apply Pattern**: Use `const { apply: ReflectApply } = Reflect` and `ReflectApply(fn, thisArg, [])` instead of `.call()` for method invocation
3. **Object Mappings**: Use `{ __proto__: null, ...mapping }` for static string-to-string mappings to prevent prototype pollution
4. **Import Separation**: ALWAYS separate type imports (`import type`) from runtime imports
5. **Node.js Imports**: ALWAYS use `node:` prefix for Node.js built-in modules
6. **🚨 TSGO PRESERVATION**: NEVER replace tsgo with tsc - tsgo provides enhanced performance and should be maintained across all Socket projects

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
