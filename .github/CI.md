# Continuous Integration (CI) Documentation

This document describes the comprehensive CI testing solution for socket-registry, which serves as the centralized source for reusable workflows used across all Socket projects.

## Overview

The CI pipeline is designed for reliability, speed, and comprehensive coverage. Socket-registry hosts centralized reusable workflows and actions that ensure consistency across all Socket projects.

## Workflows

### 🚀 Main CI Pipeline (`ci.yml`)

**Purpose**: Orchestrates all quality checks in parallel for fast feedback.

**Triggers**:
- Push to `main` branch
- Pull requests to `main`
- Manual workflow dispatch

**Jobs**:
1. **Lint Check** - Runs ESLint, Biome, and Oxlint
2. **Type Check** - Validates TypeScript types with tsgo
3. **Test Matrix** - Tests across Node 20, 22, 24 on Ubuntu and Windows
4. **Coverage Report** - Generates and uploads coverage artifacts
5. **CI Summary** - Validates all jobs passed

**Configuration**:
```yaml
lint:
  node-version: '22'
  timeout-minutes: 10

type-check:
  node-version: '22'
  timeout-minutes: 10

test:
  node-versions: '[20, 22, 24]'
  os-versions: '["ubuntu-latest", "windows-latest"]'
  timeout-minutes: 15
  fail-fast: false
  max-parallel: 4
```

### 🧪 Test Workflow (`test.yml`)

**Purpose**: Comprehensive cross-platform and cross-version testing.

**Features**:
- Tests on Node.js 20, 22, and 24
- Tests on Ubuntu and Windows
- Non-blocking (fail-fast: false) to see all failures
- Parallel execution (max 4 jobs)
- 15-minute timeout per job

**Usage**:
```bash
# Local testing
pnpm run test-ci

# CI environment
pnpm run build && pnpm run test-ci
```

### 🧹 Lint Workflow (`lint.yml`)

**Purpose**: Code quality and style enforcement.

**Checks**:
- ESLint with TypeScript support
- Oxlint for fast Rust-based linting
- Biome for formatting

**Configuration**:
- Runs on Node.js 22 (latest LTS)
- Ubuntu runner (fast and cost-effective)
- 10-minute timeout

**Usage**:
```bash
# CI lint check
pnpm run check-ci

# Local development
pnpm run check:lint
pnpm run check:lint:fix
```

### 🔍 Type Check Workflow (`types.yml`)

**Purpose**: TypeScript type safety validation.

**Features**:
- Uses tsgo (native TypeScript compiler)
- Runs type-coverage checks
- Builds project first to ensure types are generated

**Configuration**:
- Node.js 22 for consistency
- 10-minute timeout
- Requires build step

**Usage**:
```bash
# CI type check
pnpm run build && pnpm run check:tsc

# Local development
pnpm run check:tsc
```

## Centralized Workflows

Socket-registry provides reusable workflows at `SocketDev/socket-registry/.github/workflows/` for use across all Socket projects.

### CI Pipeline Workflow

The main `ci.yml` workflow orchestrates all quality checks and provides these customization options:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `coverage-script` | `''` | Script to run tests with coverage |
| `coverage-report-script` | `''` | Script to generate coverage report |
| `lint-script` | `'pnpm run check-ci'` | Lint command |
| `lint-node-version` | `'22'` | Node.js version for linting |
| `node-versions` | `'[20, 22, 24]'` | Node.js versions to test |
| `os-versions` | `'["ubuntu-latest", "windows-latest"]'` | Operating systems |
| `test-script` | `'pnpm run test-ci'` | Test command |
| `test-setup-script` | `''` | Script to run before tests |
| `type-check-script` | `'pnpm run check:tsc'` | Type check command |
| `type-check-setup-script` | `''` | Setup before type checking |
| `fail-fast` | `false` | Cancel all matrix jobs if one fails |
| `max-parallel` | `4` | Maximum concurrent jobs |
| `run-coverage` | `true` | Include coverage reporting job |
| `run-lint` | `true` | Include lint check job |
| `run-test` | `true` | Include test matrix job |
| `run-type-check` | `true` | Include type check job |

### Test Workflow Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `node-versions` | `[20, 22, 24]` | Node.js versions to test |
| `os-versions` | `["ubuntu-latest", "windows-latest"]` | Operating systems |
| `setup-script` | `''` | Script to run before tests |
| `test-script` | `'pnpm run test-ci'` | Test command |
| `timeout-minutes` | `10` | Job timeout |
| `fail-fast` | `true` | Cancel all jobs if one fails |
| `max-parallel` | `4` | Maximum concurrent jobs |

### Lint Workflow Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `lint-script` | `'pnpm run check-ci'` | Lint command |
| `node-version` | `'22'` | Node.js version |
| `os` | `'ubuntu-latest'` | Operating system |
| `timeout-minutes` | `10` | Job timeout |

### Type Check Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `type-script` | `'pnpm run check:tsc'` | Type check command |
| `setup-script` | `''` | Setup before type checking |
| `node-version` | `'22'` | Node.js version |
| `timeout-minutes` | `10` | Job timeout |

## Best Practices

### 1. Concurrency Control

The main CI pipeline (`ci.yml`) uses concurrency groups to cancel outdated runs:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.run_id }}
  cancel-in-progress: true
```

This saves CI minutes by canceling superseded runs when new commits are pushed.

**Important**: Reusable workflows (`test.yml`, `lint.yml`, `types.yml`) should NOT define their own concurrency groups as they inherit the calling workflow's context, which can cause deadlocks.

### 2. Fail-Fast Strategy

The test matrix uses `fail-fast: false` to:
- Show all test failures across platforms
- Identify platform-specific issues
- Provide complete failure information

### 3. Timeout Configuration

Timeouts are set conservatively:
- **Lint**: 10 minutes (fast)
- **Type Check**: 10 minutes (requires build)
- **Tests**: 15 minutes (includes build + cross-platform)
- **Coverage**: 15 minutes (most intensive)

### 4. Node Version Support

Supports Node.js LTS and current versions:
- **Node 20**: Active LTS (until April 2026)
- **Node 22**: Active LTS (until April 2027)
- **Node 24**: Current (becomes LTS October 2025)

### 5. Cross-Platform Testing

Tests on both:
- **Ubuntu**: Fast, cost-effective, primary development platform
- **Windows**: Ensures compatibility with Windows-specific issues

macOS testing can be added if needed, but is typically unnecessary for Node.js libraries.

## Local Development

### Running All Checks Locally

```bash
# Complete test suite (same as CI)
pnpm test

# Individual checks
pnpm run check:lint      # Linting only
pnpm run check:tsc       # Type checking only
pnpm run test:unit       # Unit tests only

# With coverage
pnpm run coverage
pnpm run coverage:percent
```

### Pre-commit Hooks

The project uses Husky and lint-staged:
```bash
# Runs automatically on git commit
git commit -m "message"

# Manual run
pnpm run lint-staged
```

### Fixing Issues

```bash
# Auto-fix lint issues
pnpm run fix

# Fix specific issues
pnpm run check:lint:fix
pnpm run lint:fix
```

## Troubleshooting

### Test Failures

1. **Platform-specific failures**: Check the test matrix to see which OS/Node version failed
2. **Timeout failures**: Increase timeout in workflow configuration
3. **Flaky tests**: Review test isolation and async handling

### Type Check Failures

1. **Missing types**: Run `pnpm run build` to generate type declarations
2. **Type coverage**: Check `pnpm run coverage:type:verbose` for details
3. **tsgo issues**: Ensure `@typescript/native-preview` is up to date

### Lint Failures

1. **Oxlint errors**: Fast but may need exceptions in `.oxlintrc.json`
2. **ESLint errors**: Check `.eslintrc` configuration
3. **Biome errors**: Review `biome.json` settings

### CI-Only Failures

If tests pass locally but fail in CI:
1. Check Node.js version matches (`node --version`)
2. Verify environment variables (`.env.test`)
3. Review OS-specific path handling
4. Check for race conditions in tests

## Performance Optimization

### Caching

The reusable workflows automatically cache:
- pnpm dependencies
- Build outputs
- Node modules

### Parallel Execution

- Lint, type check, and tests run in parallel
- Test matrix runs 4 jobs concurrently
- Coverage report runs independently

### Artifact Management

Coverage reports are uploaded with 7-day retention:
```yaml
retention-days: 7
```

Adjust if longer retention is needed.

## Reusable Actions

Socket-registry provides composite actions at `SocketDev/socket-registry/.github/actions/`:

### Available Actions

| Action | Purpose |
|--------|---------|
| `setup-and-install` | Checkout, setup Node.js, install pnpm, cache dependencies |
| `run-script` | Run setup and main scripts with proper error handling |
| `artifacts` | Upload test results, coverage, and lint artifacts |
| `debug` | Debug output for troubleshooting workflows |
| `cache-npm-packages` | Cache npm package operations |

## Using in Other Socket Projects

To use socket-registry workflows in another project:

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    uses: SocketDev/socket-registry/.github/workflows/ci.yml@cb058af30991fa29b82f0c89f7d37397e067d292 # main
    with:
      coverage-script: 'pnpm run test:coverage'
      lint-script: 'pnpm run check:lint'
      node-versions: '[20, 22, 24]'
      test-script: 'pnpm run test'
      test-setup-script: 'pnpm run build'
      type-check-script: 'pnpm run check:tsc'
```

## Troubleshooting Common Issues

### Workflow Deadlocks

**Symptom**: Workflows show "queued" status but jobs have completed.

**Cause**: Reusable workflows with their own concurrency groups inherit the calling workflow's context.

**Solution**: Remove concurrency groups from reusable workflows (`test.yml`, `lint.yml`, `types.yml`). Only the parent CI workflow should define concurrency.

### Action Reference Errors

**Symptom**: "Action not found" or "Invalid action reference" errors.

**Cause**: Actions are referenced using commit SHAs that don't exist yet or changes haven't been pushed/merged.

**Solution**: Push changes to main branch first, then update references to use the new commit SHA.

## References

- [socket-registry workflows](https://github.com/SocketDev/socket-registry/tree/main/.github/workflows)
- [GitHub Actions reusable workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
- [Node.js release schedule](https://github.com/nodejs/release#release-schedule)
- [GitHub Actions concurrency](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#concurrency)
