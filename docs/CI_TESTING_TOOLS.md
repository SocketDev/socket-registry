# CI Testing Tools

Quick reference for the CI testing and validation tools.

## TL;DR

```bash
# Before releasing a package
pnpm run validate:packages --package <name>
pnpm run validate:ci --package <name>

# When CI fails
pnpm run analyze:ci-failures --log-url <ci-log-url>
```

## Tools Overview

### 1. Package Validation (`validate:packages`)

**Purpose:** Pre-release validation of package structure and tests

**Location:** `scripts/testing/validate-package-tests.mjs`

**Usage:**
```bash
# Validate specific package
pnpm run validate:packages --package deep-equal

# Validate multiple packages
pnpm run validate:packages --package deep-equal --package aggregate-error

# Validate all packages
pnpm run validate:packages

# Verbose output
pnpm run validate:packages --verbose

# Control concurrency
pnpm run validate:packages --concurrency 10
```

**Checks:**
- ✅ package.json validity (name, version, main/exports)
- ✅ Test files exist in standard locations
- ✅ Module resolution correctness
- ✅ Build artifacts presence
- ✅ ESLint configuration validity
- ✅ Dependencies install correctly

**Output:**
- Errors: Critical issues that will cause CI failures
- Warnings: Issues that should be addressed
- Success: Package passes all checks

### 2. CI Reproduction (`validate:ci`)

**Purpose:** Reproduce CI environment locally before pushing

**Location:** `scripts/testing/reproduce-ci-locally.mjs`

**Usage:**
```bash
# Full CI run
pnpm run validate:ci

# Test specific package
pnpm run validate:ci --package deep-equal

# Skip build (if already built)
pnpm run validate:ci --skip-build

# Skip installation (if already installed)
pnpm run validate:ci --skip-install

# Keep temp directory for debugging
pnpm run validate:ci --keep-temp

# Verbose output
pnpm run validate:ci --verbose
```

**Process:**
1. Creates isolated test environment
2. Copies project (excludes node_modules, artifacts)
3. Sets CI=true environment
4. Runs: install → build → lint → typecheck → tests
5. Reports success/failure

**Benefits:**
- Catches CI-specific issues locally
- Faster iteration than waiting for CI
- Identical environment to actual CI

### 3. Failure Analysis (`analyze:ci-failures`)

**Purpose:** Analyze CI logs and suggest fixes

**Location:** `scripts/testing/analyze-ci-failures.mjs`

**Usage:**
```bash
# Analyze CI log URL
pnpm run analyze:ci-failures --log-url https://example.com/ci-log.txt

# Analyze local log file
pnpm run analyze:ci-failures --log-file path/to/ci.log

# Verbose output with detailed failures
pnpm run analyze:ci-failures --log-url <url> --verbose
```

**Features:**
- Categorizes failures by type
- Groups failures by affected package
- Suggests specific fixes for each category
- Provides actionable reproduction commands

**Output:**
- Failures by category (count)
- Affected packages (with issue details)
- Recommended actions (validation commands)
- General suggestions (by category)

### 4. Test Template

**Purpose:** Standard test template for new package override tests

**Location:** `scripts/templates/testing/package-test-template.mts`

**Existing Tests:** `test/npm/` directory contains package override tests
- Examples: `test/npm/safer-buffer.test.mts`, `test/npm/json-stable-stringify.test.mts`

**Usage:**
```bash
# Copy template for new package test
cp scripts/templates/testing/package-test-template.mts test/npm/<package-name>.test.mts

# Edit the template:
# 1. Package name is auto-detected from filename
# 2. Add package-specific functionality tests
# 3. Follow patterns from existing test/npm/ tests
```

**Includes:**
- Standard test setup with `installPackageForTesting`
- Skip logic for conditional testing
- Proper imports and structure
- Example functionality tests
- Helper functions for package installation

## Workflow Integration

### During Development

```bash
# Creating new package
cp scripts/templates/testing/package-test-template.mts packages/npm/<package>/test/index.test.mjs
# Edit template for your package

# Before committing
pnpm run validate:packages --package <package>
```

### Before Release

```bash
# Full validation
pnpm run validate:packages --package <package>
pnpm run validate:ci --package <package>

# Fix issues if found
# Re-validate
```

### When CI Fails

```bash
# 1. Analyze failure
pnpm run analyze:ci-failures --log-url <ci-log-url>

# 2. Reproduce locally
pnpm run validate:ci --package <failing-package> --verbose

# 3. Investigate specific issues
pnpm run validate:packages --package <failing-package> --verbose

# 4. Fix root cause
# ... make fixes ...

# 5. Re-validate
pnpm run validate:packages --package <package>
pnpm run validate:ci --package <package>
```

## Common Options

| Option | Description | Available In |
|--------|-------------|--------------|
| `--package <name>` | Validate specific package | validate:packages, validate:ci, analyze:ci-failures |
| `--verbose` | Detailed output | All tools |
| `--concurrency <n>` | Control parallelism | validate:packages |
| `--skip-build` | Skip build step | validate:ci |
| `--skip-install` | Skip dependency installation | validate:ci |
| `--keep-temp` | Preserve temp directory | validate:ci |
| `--log-file <path>` | Local log file | analyze:ci-failures |
| `--log-url <url>` | CI log URL | analyze:ci-failures |

## Exit Codes

- `0`: Success
- `1`: Errors found (validation) or failures detected (analysis)

## Documentation

- **Comprehensive Guide:** `docs/PACKAGE_TESTING_GUIDE.md`
- **CLAUDE.md Section 5.2:** Package Override Testing requirements
- **Tool Locations:**
  - `scripts/testing/validate-package-tests.mjs`
  - `scripts/testing/reproduce-ci-locally.mjs`
  - `scripts/testing/analyze-ci-failures.mjs`
  - `scripts/templates/testing/package-test-template.mts`

## Tips

1. **Always validate before releasing** - catches 80%+ of CI failures
2. **Use verbose mode when debugging** - provides detailed error context
3. **Keep temp directory when investigating** - allows inspection of test environment
4. **Run validation concurrently** - faster validation of multiple packages
5. **Analyze CI logs immediately** - get actionable suggestions quickly

## Examples

### Example 1: New Package Release

```bash
# Validate package structure
pnpm run validate:packages --package my-new-package --verbose

# Reproduce CI locally
pnpm run validate:ci --package my-new-package

# If all passes, proceed with release
```

### Example 2: CI Failure Investigation

```bash
# Get CI log URL from GitHub Actions
CI_LOG_URL="https://example.com/ci-log.txt"

# Analyze failures
pnpm run analyze:ci-failures --log-url "$CI_LOG_URL"

# Output shows: deep-equal has module resolution issues

# Reproduce locally
pnpm run validate:ci --package deep-equal --keep-temp --verbose

# Fix issues in the package
# ... make fixes ...

# Validate fixes
pnpm run validate:packages --package deep-equal
pnpm run validate:ci --package deep-equal
```

### Example 3: Batch Validation

```bash
# Validate multiple packages before bulk release
pnpm run validate:packages \
  --package deep-equal \
  --package aggregate-error \
  --package indent-string \
  --concurrency 5 \
  --verbose
```

## Troubleshooting

**Problem:** Validation script fails to install dependencies

**Solution:** Check that package.json has all dependencies declared

---

**Problem:** CI reproduction runs slowly

**Solution:** Use `--skip-install` if dependencies already installed

---

**Problem:** Can't find specific issue in validation output

**Solution:** Use `--verbose` flag for detailed error messages

---

**Problem:** Temp directory fills up disk space

**Solution:** Validation automatically cleans up; use `--keep-temp` only when debugging

---

See `docs/PACKAGE_TESTING_GUIDE.md` for comprehensive troubleshooting.
