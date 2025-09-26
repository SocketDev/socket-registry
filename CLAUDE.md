# CLAUDE.md

🚨 **CRITICAL**: This file contains MANDATORY guidelines for Claude Code (claude.ai/code). You MUST follow these guidelines EXACTLY as specified. Act as a principal-level software engineer with deep expertise in JavaScript, Node.js, and package registry management.

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
- Examples: c8 comment formatting, error handling patterns, code style rules
- This ensures consistency across the Socket ecosystem

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
- **Use `trash` package in scripts**, NOT in registry/lib code
- Registry/lib should use native fs.rm for performance
- Scripts should use trash for safety (files go to system trash/recycle bin)
- `trash` accepts arrays - optimize by collecting paths and passing as array

### 1.5. Performance Critical Operations
- This registry serves Socket's security analysis infrastructure
- Optimize for speed without sacrificing correctness in package processing
- Benchmark performance-sensitive changes against existing baselines
- Avoid unnecessary allocations in hot paths

### 2. Package Manager Agent
- `registry/lib/agent.js` (formerly npm.js) handles npm, pnpm, and yarn
- Supports both Windows and Unix platforms
- `execNpm`, `execPnpm`, `execYarn` functions available
- Bin path resolution works across different installation methods

### 3. Cross-Platform Compatibility - CRITICAL: Windows and POSIX
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
- **Line endings**: Be aware of CRLF (Windows) vs LF (Unix) differences when processing text files
- **Shell commands**: Consider platform differences in shell commands and utilities

### 4. Testing
- Always run lint and typecheck before committing:
  - `pnpm run lint`
  - `pnpm run typecheck`
- Run tests with: `pnpm test`
- Pre-commit hooks will run automatically

### 5. Git Workflow
- **DO NOT commit automatically** - let the user review changes first
- Use `--no-verify` flag only when explicitly requested
- Always provide clear, descriptive commit messages

### 6. Package Management
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

### 6. Code Style
- Follow existing patterns in the codebase
- Don't add comments unless specifically requested
- Maintain consistency with surrounding code
- Use existing utilities from registry/lib where available
- **Dynamic imports**: Only use dynamic imports for test mocking (e.g., `vi.importActual` in Vitest). Avoid runtime dynamic imports in production code

### 7. Error Handling
- Scripts should use trash for safer deletion
- Provide fallback behavior when optional dependencies aren't available
- Use try-catch blocks for resilient code

### 8. Test Coverage
- All `c8 ignore` comments MUST include a reason why the code is being ignored
- All c8 ignore comments MUST end with periods for consistency
- Format: `// c8 ignore start - Reason for ignoring.`
- Example: `// c8 ignore start - Internal helper functions not exported.`
- This helps maintain clarity about why certain code paths aren't tested

## 📋 Code Style (MANDATORY PATTERNS)

### 📁 File Organization
- **File extensions**: Use `.js` for JavaScript files with JSDoc, `.mjs` for ES modules
- **Import order**: Node.js built-ins first, then third-party packages, then local imports
- **Import grouping**: Group imports by source (Node.js, external packages, local modules)
- **Node.js module imports**: 🚨 MANDATORY - Always use `node:` prefix for Node.js built-in modules
  - ✅ CORRECT: `import { readFile } from 'node:fs'`, `import path from 'node:path'`
  - ❌ FORBIDDEN: `import { readFile } from 'fs'`, `import path from 'path'`

### 🔧 Formatting Rules
- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes for strings
- **Semicolons**: No semicolons
- **Variables**: Use camelCase for variables and functions

### 🏗️ Code Structure (CRITICAL PATTERNS)
- **Error handling**: REQUIRED - Use try-catch blocks and handle errors gracefully
- **Array destructuring**: Use object notation `{ 0: key, 1: data }` instead of array destructuring `[key, data]`
- **Comment formatting**: 🚨 MANDATORY - ALL comments MUST follow these rules:
  - **Periods required**: Every comment MUST end with a period, except ESLint disable comments and URLs which are directives/references. This includes single-line, multi-line, inline, and c8 ignore comments.
  - **Sentence structure**: Comments should be complete sentences with proper capitalization and grammar.
  - **Placement**: Place comments on their own line above the code they describe, not trailing to the right of code.
  - **Style**: Use fewer hyphens/dashes and prefer commas, colons, or semicolons for better readability.
  - **Examples**:
    - ✅ CORRECT: `// This function validates user input.`
    - ✅ CORRECT: `/* This is a multi-line comment that explains the complex logic below. */`
    - ✅ CORRECT: `// eslint-disable-next-line no-await-in-loop` (directive, no period)
    - ✅ CORRECT: `// See https://example.com/docs` (URL reference, no period)
    - ✅ CORRECT: `// c8 ignore start - Reason for ignoring.` (explanation has period)
    - ❌ WRONG: `// this validates input` (no period, not capitalized)
    - ❌ WRONG: `const x = 5 // some value` (trailing comment)
- **Await in loops**: When using `await` inside for-loops, add `// eslint-disable-next-line no-await-in-loop` to suppress the ESLint warning when sequential processing is intentional
- **If statement returns**: Never use single-line return if statements; always use proper block syntax with braces
- **List formatting**: Use `-` for bullet points in text output, not `•` or other Unicode characters, for better terminal compatibility
- **Existence checks**: Perform simple existence checks first before complex operations
- **Destructuring order**: Sort destructured properties alphabetically in const declarations
- **Function ordering**: Place functions in alphabetical order, with private functions first, then exported functions

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
- **External dependencies**: `/registry/external/` - Bundled external dependencies

### Build System
- Uses Rollup for building external dependencies
- TypeScript support with tsconfig
- Multiple environment configs (.env.local, .env.test, .env.external)
- Dual linting with oxlint and eslint
- Formatting with Biome

### Testing
- Vitest for unit testing
- Test files use `.test.js` extension
- Fixtures in `test/fixtures/`
- Pre-commit hooks for quality assurance

#### Vitest Memory Optimization (CRITICAL)
- **Pool configuration**: Use `pool: 'forks'` with `singleFork: true`, `maxForks: 1`, `isolate: true`
- **Memory limits**: Set `NODE_OPTIONS="--max-old-space-size=4096 --max-semi-space-size=512"` in `.env.test`
- **Timeout settings**: Use `testTimeout: 60000, hookTimeout: 60000` for stability
- **Thread limits**: Use `singleThread: true, maxThreads: 1` to prevent RegExp compiler exhaustion
- **Test cleanup**: 🚨 MANDATORY - Use `await trash([paths])` in test scripts/utilities only. For cleanup within `/src/` test files, use `fs.rm()` with proper error handling

### 🗑️ Safe File Operations (SECURITY CRITICAL)
- **Import and use `trash` package**: `import trash from 'trash'` then `await trash(paths)`
- **ALL deletion operations**: Use `await trash()` for scripts, tests, and any cleanup
- **Array optimization**: `trash` accepts arrays - collect paths and pass as array
- **Async requirement**: Always `await trash()` - it's an async operation
- **NO rmSync**: 🚨 ABSOLUTELY FORBIDDEN - NEVER use `fs.rmSync()` or `rm -rf`
- **Examples**:
  - ❌ CATASTROPHIC: `rm -rf directory` (permanent deletion - DATA LOSS RISK)
  - ❌ REPOSITORY DESTROYER: `rm -rf "$(pwd)"` (deletes entire repository)
  - ❌ FORBIDDEN: `fs.rmSync(tmpDir, { recursive: true, force: true })` (test cleanup)
  - ✅ SAFE: `await trash([tmpDir])` (recoverable deletion)
- **Why this matters**: `trash` enables recovery from accidental deletions via system trash/recycle bin

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

## Notes

- The project maintains a registry of NPM packages with security-focused modifications
- Be careful with file operations - prefer moving to trash over permanent deletion in scripts
- The codebase supports multiple package managers (npm, pnpm, yarn)
- Windows compatibility is important - test path handling carefully
- Always run lint and typecheck before committing