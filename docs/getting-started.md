# Getting Started with Socket Registry

Welcome to Socket Registry! This guide will help you set up your development environment and start contributing.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/SocketDev/socket-registry.git
cd socket-registry

# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run checks (lint + type check)
pnpm run check

# Run tests
pnpm test
```

You're ready to develop!

## Prerequisites

**Required:**
- **Node.js** 18.0.0 or higher (20, 22, 24 recommended)
- **pnpm** 10.16.0 or higher

**Recommended:**
- **Git** 2.0 or higher
- **VSCode** with recommended extensions (see `.vscode/extensions.json`)

**Install pnpm:**
```bash
npm install -g pnpm
# or
brew install pnpm
```

## Repository Structure

```
socket-registry/
├── docs/                   # Documentation (you are here!)
├── packages/npm/           # NPM package overrides (130+ packages)
├── registry/               # Core registry library (@socketsecurity/registry)
│   ├── src/                # TypeScript source code
│   └── dist/               # Compiled output
├── scripts/                # Development and build scripts (80+)
├── test/                   # Test suites
│   ├── npm/                # NPM package tests
│   ├── registry/           # Registry library tests
│   └── utils/              # Test helpers
├── CLAUDE.md               # Project standards (READ THIS!)
├── README.md               # Project overview
└── package.json            # Monorepo root
```

## Development Workflow

### 1. Initial Setup

After cloning, run:

```bash
pnpm install  # Install all dependencies (monorepo + packages)
pnpm run build  # Build registry library
```

**Expected output:**
```
✓ Build completed successfully!
```

### 2. Make Changes

Edit files in:
- `registry/src/` - Core library code
- `packages/npm/<package>/` - Package overrides
- `scripts/` - Development scripts
- `test/` - Tests

### 3. Verify Your Changes

```bash
# Run all checks (lint + type check)
pnpm run check

# Run tests
pnpm test

# Auto-fix linting issues
pnpm run fix
```

### 4. Before Committing

```bash
# This runs automatically via Husky pre-commit hook:
pnpm run fix    # Auto-fix what's possible
pnpm run check  # Verify everything passes
```

**Pre-commit hooks will:**
- Run linting on staged files
- Run type checking
- Run affected tests

## Common Tasks

### Creating a New NPM Package Override

```bash
pnpm run make:npm-override <package-name>
```

**Interactive wizard will:**
1. Fetch package metadata
2. Download and analyze source
3. Generate override scaffold
4. Create test template

**Then you:**
1. Fill in `TODO:` comments in generated files
2. Implement override logic
3. Run tests: `pnpm test test/npm/<package>.test.mts`
4. Commit changes

See [package-testing-guide.md](./package-testing-guide.md) for details.

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test test/npm/is-array-buffer.test.mts

# Run with coverage
pnpm run cover

# Test all NPM packages (LONG-running, ~30+ min)
node scripts/test-npm-packages.mjs
```

**Important:** Never use `--` before test paths (it runs all tests).

### Linting and Formatting

```bash
# Check linting
pnpm run lint

# Auto-fix issues
pnpm run fix

# Type check
pnpm run type
```

**Tools used:**
- **Biome** - Primary formatter/linter
- **ESLint** - Additional linting rules
- **TypeScript** - Type checking

### Building

```bash
# Build registry library
pnpm run build

# Clean build artifacts
pnpm run clean
```

### Updating Dependencies

```bash
# Check for updates
pnpm run taze

# Update dependencies (interactive)
pnpm run update
```

## Development Environment

### VSCode Setup

Recommended extensions (auto-suggested):
- Biome (formatter/linter)
- ESLint
- Vitest (test runner)

Settings are pre-configured in `.vscode/settings.json`.

### Environment Variables

Create `.env.local` for local development:
```bash
# Add your environment-specific variables
NODE_ENV=development
```

**Available env files:**
- `.env.test` - Test environment
- `.env.precommit` - Pre-commit hooks
- `.env.local` - Your local overrides (gitignored)

## Testing Guide

### Test Helpers

Located in `test/utils/`, these reduce boilerplate:

**NPM Package Helper:**
```typescript
import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const { module: assert, pkgPath, skip, eco, sockRegPkgName } =
  await setupNpmPackageTest(__filename)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('should work', () => {
    expect(assert).toBeDefined()
  })
})
```

**Temp File Helper:**
```typescript
import { withTempDir, runWithTempDir } from '../utils/temp-file-helper.mts'

await runWithTempDir(async (tmpDir) => {
  // Use tmpDir... cleanup happens automatically
}, 'test-prefix-')
```

**Platform Test Helpers:**
```typescript
import { itOnWindows, itOnUnix } from '../utils/platform-test-helpers.mts'

itOnWindows('should handle Windows paths', () => {
  expect(path.sep).toBe('\\')
})
```

See [test-helpers.md](./test-helpers.md) for complete guide.

## Project Standards

**Read CLAUDE.md** - Contains all project standards:
- Code style (file organization, naming, patterns)
- Git workflow (commit messages, pre-commit hooks)
- Cross-platform compatibility (CRITICAL)
- Testing practices
- Documentation standards
- And much more

**Key highlights:**

**File naming:**
- `kebab-case.mts` for TypeScript modules
- `lowercase-with-hyphens.md` for docs

**Code style:**
- Omit semicolons (except SDK)
- MANDATORY `node:` prefix for Node.js imports
- MANDATORY `__proto__: null` first in object literals
- Alphabetical sorting (imports, exports, properties)

**Git commits:**
- Conventional Commits format
- No AI attribution in messages

## Troubleshooting

### Installation Issues

**Problem:** `pnpm install` fails

**Solution:**
```bash
# Clear cache and retry
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Build Issues

**Problem:** Build fails with type errors

**Solution:**
```bash
# Clean and rebuild
pnpm run clean
pnpm run build
```

### Test Issues

**Problem:** Tests fail with "module not found"

**Solution:**
```bash
# Ensure build is current
pnpm run build
pnpm test
```

**Problem:** Memory issues during tests

**Solution:** Tests use memory-optimized config (`singleFork`, `maxForks: 1`)

### Pre-commit Hook Issues

**Problem:** Hooks blocked my commit

**Solution:** Fix issues reported:
```bash
pnpm run fix     # Auto-fix what's possible
pnpm run check   # Verify all passes
git add .
git commit
```

## Next Steps

1. **Read the docs:**
   - [CLAUDE.md](../CLAUDE.md) - Project standards (essential reading!)
   - [test-helpers.md](./test-helpers.md) - Testing utilities
   - [package-testing-guide.md](./package-testing-guide.md) - Package testing
   - [http-utilities.md](./http-utilities.md) - HTTP utilities

2. **Explore the codebase:**
   - `registry/src/` - Core library
   - `packages/npm/` - Package overrides
   - `scripts/` - Automation scripts
   - `test/` - Test suites

3. **Pick a task:**
   - Browse open issues on GitHub
   - Create a new package override
   - Improve existing documentation
   - Add test coverage

4. **Join the community:**
   - Follow [@SocketSecurity](https://twitter.com/SocketSecurity) on Twitter
   - Follow [@socket.dev](https://bsky.app/profile/socket.dev) on Bluesky

## Quick Reference

### Essential Commands

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install dependencies |
| `pnpm run build` | Build registry library |
| `pnpm run check` | Lint + type check |
| `pnpm test` | Run tests |
| `pnpm run fix` | Auto-fix linting |
| `pnpm run cover` | Test coverage |
| `pnpm run clean` | Clean artifacts |
| `pnpm run make:npm-override` | Create new override |
| `pnpm run update` | Update dependencies |

### File Locations

| What | Where |
|------|-------|
| Documentation | `docs/` |
| Package overrides | `packages/npm/<package>/` |
| Core library | `registry/src/` |
| Tests | `test/` (npm, registry, unit, utils) |
| Scripts | `scripts/` |
| Standards | `CLAUDE.md` |
| GitHub workflows | `.github/workflows/` |

### Help Resources

- **Main README**: [../README.md](../README.md)
- **Project standards**: [../CLAUDE.md](../CLAUDE.md)
- **Test helpers**: [test-helpers.md](./test-helpers.md)
- **Package testing**: [package-testing-guide.md](./package-testing-guide.md)
- **HTTP utilities**: [http-utilities.md](./http-utilities.md)

---

**Welcome to Socket Registry!** We're excited to have you contributing to a more secure npm ecosystem.
