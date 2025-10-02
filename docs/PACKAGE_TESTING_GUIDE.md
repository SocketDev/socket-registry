# Package Testing Guide

This guide provides a comprehensive approach to prevent recurring CI failures in package overrides.

## Quick Start

Before releasing any package override:

```bash
# Validate package structure and tests
pnpm run validate:packages --package <package-name>

# Reproduce CI environment locally
pnpm run validate:ci --package <package-name>
```

## Overview

Package override tests have been a recurring source of CI failures. This guide and tooling provide a systematic approach to:

1. **Prevent** issues before they reach CI
2. **Detect** problems early in development
3. **Diagnose** failures quickly when they occur
4. **Fix** root causes, not symptoms

## Common Failure Categories

### 1. Module Resolution Failures

**Symptoms:**
- `Cannot find module` errors
- Path resolution issues
- `.pnpm` directory references

**Root Causes:**
- Nested pnpm dependencies not properly hoisted
- Missing build artifacts
- Hard-coded paths to node_modules
- Direct `.pnpm` directory references

**Prevention:**
```javascript
// ❌ WRONG
import foo from '../../node_modules/foo'
import bar from 'node_modules/.pnpm/bar@1.0.0/node_modules/bar'

// ✅ CORRECT
import foo from 'foo'
import bar from 'bar'
```

### 2. Missing Test Infrastructure

**Symptoms:**
- "No test files found"
- Test script failures
- Missing test dependencies

**Root Causes:**
- Test files not in expected locations
- Incorrect test script configuration
- Test files excluded by .gitignore

**Prevention:**
- Place tests in `test/`, `tests/`, or `__tests__/` directories
- Ensure test files have `.test.js` or `.test.mjs` extensions
- Verify test script in package.json points to correct location

### 3. ESLint Configuration Errors

**Symptoms:**
- "Failed to load plugin" errors
- Invalid ESLint configuration

**Root Causes:**
- Missing ESLint plugins in dependencies
- Invalid ESLint configuration syntax
- Plugin version incompatibilities

**Prevention:**
- Add all ESLint plugins to devDependencies
- Test ESLint config with `pnpm eslint --print-config .`
- Consider removing .eslintrc if not essential

### 4. Parsing Errors

**Symptoms:**
- "Unexpected token" errors
- Syntax errors in JavaScript files

**Root Causes:**
- Invalid JavaScript/TypeScript syntax
- Binary files treated as text
- Build step not completed

**Prevention:**
- Validate syntax before committing
- Ensure build step runs successfully
- Check file encodings

### 5. Build Artifact Issues

**Symptoms:**
- Entry points don't exist
- TypeScript compilation failures
- Missing build outputs

**Root Causes:**
- Build artifacts not committed
- Incorrect entry points in package.json
- Build step failures

**Prevention:**
- Verify all entry points (main, exports) exist
- Commit required build artifacts
- Test build step before release

## Validation Tools

### 1. Pre-Release Validation Script

`validate-package-tests.mjs` validates package structure before release.

**Usage:**
```bash
# Validate all packages
pnpm run validate:packages

# Validate specific package
pnpm run validate:packages --package deep-equal

# Validate multiple packages
pnpm run validate:packages --package deep-equal --package aggregate-error

# Verbose output
pnpm run validate:packages --package deep-equal --verbose

# Control concurrency
pnpm run validate:packages --concurrency 10
```

**Checks:**
- ✅ package.json validity and required fields
- ✅ Test file existence and locations
- ✅ Module resolution correctness
- ✅ Build artifacts presence
- ✅ ESLint configuration validity
- ✅ Dependency installation in isolated environment

### 2. Local CI Reproduction Script

`reproduce-ci-locally.mjs` reproduces CI environment locally.

**Usage:**
```bash
# Full CI reproduction
pnpm run validate:ci

# Test specific package
pnpm run validate:ci --package deep-equal

# Skip build step
pnpm run validate:ci --skip-build

# Skip installation
pnpm run validate:ci --skip-install

# Keep temporary directory for debugging
pnpm run validate:ci --keep-temp

# Verbose output
pnpm run validate:ci --verbose
```

**Steps:**
1. Creates isolated test environment
2. Copies project (excluding node_modules, artifacts)
3. Runs in CI mode with CI=true environment
4. Executes: install → build → lint → typecheck → tests
5. Reports results and suggests fixes

### 3. CI Failure Analysis Script

`analyze-ci-failures.mjs` analyzes CI logs and suggests fixes.

**Usage:**
```bash
# Analyze local log file
pnpm run analyze:ci-failures --log-file path/to/ci.log

# Analyze CI log URL
pnpm run analyze:ci-failures --log-url https://example.com/ci-log.txt

# Verbose output with detailed failures
pnpm run analyze:ci-failures --log-url <url> --verbose
```

**Features:**
- Categorizes failures by type
- Groups failures by package
- Suggests specific fixes for each category
- Provides actionable commands to reproduce and fix

## Package Override Checklist

Use this checklist before releasing any package:

### package.json Validation
- [ ] Contains required fields: name, version
- [ ] Has main or exports field pointing to entry point
- [ ] Test script is defined and functional
- [ ] All entry points (main, exports) actually exist
- [ ] Dependencies are properly declared with exact versions

### Test Infrastructure
- [ ] Test files exist in test/, tests/, or __tests__/
- [ ] Test files use .test.js or .test.mjs extensions
- [ ] Tests can import the package code
- [ ] No hard-coded paths to node_modules
- [ ] No direct .pnpm directory references
- [ ] Tests work in isolated environments

### Module Resolution
- [ ] No relative path traversal (../../node_modules)
- [ ] All imports use package names, not .pnpm paths
- [ ] All imports resolve correctly
- [ ] Build artifacts committed if required for tests

### Cross-Platform Compatibility
- [ ] Path handling uses path.join(), not hard-coded separators
- [ ] Tests use os.tmpdir() for temporary files
- [ ] No POSIX-specific assumptions (e.g., /tmp/)
- [ ] File paths use path.sep, not / or \

### ESLint Configuration
- [ ] If .eslintrc exists, all plugins are in devDependencies
- [ ] Config is valid (test with `pnpm eslint --print-config .`)
- [ ] Consider removing if not essential

### Pre-Release Steps
- [ ] Run `pnpm run validate:packages --package <name>`
- [ ] Run `pnpm run validate:ci --package <name>`
- [ ] Fix all errors and warnings
- [ ] Test manually if validation finds issues

## Test Template

### Existing Test Structure

Package override tests are located in `test/npm/` directory. See existing examples:
- `test/npm/safer-buffer.test.mts` - Full package testing example
- `test/npm/json-stable-stringify.test.mts` - JSON utilities testing
- `test/npm/is-regex.test.mts` - Type checking utilities

### Creating New Package Tests

Use the template at `scripts/templates/testing/package-test-template.mts`:

**Template includes:**
- Standard test setup with `installPackageForTesting`
- Skip logic for conditional testing
- Proper imports and structure
- Example functionality tests

**Usage:**
```bash
# Copy template
cp scripts/templates/testing/package-test-template.mts test/npm/<package-name>.test.mts

# Edit the template:
# 1. Package name is auto-detected from filename
# 2. Add package-specific functionality tests
# 3. Follow patterns from existing test/npm/ tests
```

**Test Helper Functions:**
- `installPackageForTesting(packageName)` - Installs package for testing
- `isPackageTestingSkipped(eco, packageName)` - Conditional skip logic

## When Tests Fail in CI

Follow this systematic approach:

### 1. Fetch and Analyze Logs

```bash
# Analyze CI failure logs
pnpm run analyze:ci-failures --log-url <ci-log-url>
```

This provides:
- Categorized failures
- Affected packages
- Specific error details
- Suggested fixes

### 2. Reproduce Locally

```bash
# Reproduce CI environment for failing package
pnpm run validate:ci --package <failing-package> --verbose
```

### 3. Validate Package Structure

```bash
# Run validation checks
pnpm run validate:packages --package <failing-package> --verbose
```

### 4. Fix Root Cause

Based on analysis, fix the root cause:
- **Module resolution**: Fix import paths, ensure dependencies declared
- **Missing tests**: Add test files in correct location
- **ESLint errors**: Add missing plugins or remove config
- **Parsing errors**: Fix syntax or file encoding
- **Build artifacts**: Commit required files or fix build step

### 5. Re-validate

```bash
# Validate fixes
pnpm run validate:packages --package <package>
pnpm run validate:ci --package <package>
```

### 6. Push and Monitor

Push changes and monitor CI to confirm fixes.

## Integration with Workflow

### During Development

```bash
# When creating new package override
cp scripts/templates/testing/package-test-template.mts packages/npm/<package>/test/index.test.mjs

# Before committing
pnpm run validate:packages --package <package>
```

### Before Release

```bash
# Validate package
pnpm run validate:packages --package <package>

# Reproduce CI locally
pnpm run validate:ci --package <package>

# Fix any issues found
# Re-validate
```

### When CI Fails

```bash
# Analyze failure
pnpm run analyze:ci-failures --log-url <ci-log-url>

# Reproduce locally
pnpm run validate:ci --package <failing-package> --verbose

# Fix and re-validate
pnpm run validate:packages --package <package>
```

## Best Practices

### DO

✅ Use validation scripts before every release
✅ Reproduce CI locally to catch issues early
✅ Fix root causes, not symptoms
✅ Use test template for consistency
✅ Follow cross-platform guidelines
✅ Use path.join() for all paths
✅ Clean up with safeRemove
✅ Test in isolated environments

### DON'T

❌ Skip validation for "small" changes
❌ Hard-code file paths or separators
❌ Reference .pnpm directories directly
❌ Commit without running validation
❌ Add workarounds instead of fixing root cause
❌ Assume tests work if they pass locally
❌ Leave temporary files without cleanup

## Continuous Improvement

This testing system should evolve as we discover new patterns:

1. **Update CLAUDE.md** when new patterns emerge
2. **Enhance validation scripts** to catch new failure types
3. **Add patterns** to analyze-ci-failures.mjs
4. **Update template** with new best practices
5. **Document** package-specific quirks

## Scripts Reference

| Script | Purpose | Common Options |
|--------|---------|----------------|
| `validate:packages` | Pre-release validation | `--package`, `--verbose`, `--concurrency` |
| `validate:ci` | Local CI reproduction | `--package`, `--skip-build`, `--keep-temp`, `--verbose` |
| `analyze:ci-failures` | CI log analysis | `--log-url`, `--log-file`, `--verbose` |

## Getting Help

If validation scripts find issues you can't resolve:

1. Check CLAUDE.md section 5.2 for detailed guidelines
2. Review this guide's failure categories
3. Use `--verbose` flag for detailed output
4. Check the test template for examples
5. Review similar working packages for patterns

## Summary

By following this guide and using the provided tools, you can:

- **Prevent** 80%+ of CI failures before they happen
- **Detect** issues immediately during development
- **Diagnose** failures in minutes instead of hours
- **Fix** root causes systematically

Remember: **Validate locally before every release!**
