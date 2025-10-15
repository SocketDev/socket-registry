# Test Helper Utilities

This directory contains reusable test helper utilities that reduce boilerplate and improve test maintainability across the socket-registry project.

## Available Helpers

### 1. NPM Package Helper (`npm-package-helper.mts`)

**Purpose**: Standardizes NPM package testing setup with automatic installation and skip logic.

**Key Functions**:
- `setupNpmPackageTest(filename)` - Sets up package test environment
- `createNpmPackageBeforeAll(filename, callback)` - Creates beforeAll hook with package setup

**Usage Example**:
```typescript
import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const { module: assert, pkgPath, skip, eco, sockRegPkgName } =
  await setupNpmPackageTest(__filename)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('should have valid package structure', () => {
    expect(pkgPath).toBeTruthy()
    expect(assert).toBeDefined()
  })
})
```

**Before** (typical pattern):
```typescript
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import constants from '../../scripts/constants.mjs'
import { installPackageForTesting } from '../../scripts/utils/package.mjs'
import { isPackageTestingSkipped } from '../../scripts/utils/tests.mjs'

const { NPM, npmPackagesPath } = constants
const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.mts')

describe(
  `${eco} > ${sockRegPkgName}`,
  { skip: isPackageTestingSkipped(sockRegPkgName) },
  () => {
    let pkgPath: string
    let assert: any

    beforeAll(async () => {
      const result = await installPackageForTesting(
        npmPackagesPath,
        sockRegPkgName,
      )
      if (!result.installed) {
        throw new Error(`Failed to install package: ${result.reason}`)
      }
      pkgPath = result.packagePath!
      assert = require(pkgPath)
    })
    // ... tests
  }
)
```

**After** (with helper):
```typescript
import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const { module: assert, pkgPath, skip, eco, sockRegPkgName } =
  await setupNpmPackageTest(__filename)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  // ... tests
})
```

**Lines Saved**: ~15-20 lines per file

---

### 2. Temp File Helper (`temp-file-helper.mts`)

**Purpose**: Manages temporary files and directories with automatic cleanup.

**Key Functions**:
- `withTempDir(prefix)` - Creates temp directory with cleanup
- `withTempDirSync(prefix)` - Synchronous version
- `withTempFile(content, options)` - Creates temp file with content
- `withTempFiles(files, baseDir)` - Creates multiple temp files
- `runWithTempDir(callback, prefix)` - Executes callback with temp dir
- `runWithTempFile(content, callback, options)` - Executes callback with temp file

**Usage Example**:
```typescript
import { withTempDir } from '../utils/temp-file-helper.mts'

it('should work with temp directory', async () => {
  const { path: tmpDir, cleanup } = await withTempDir('cacache-test-')
  try {
    // Use tmpDir...
    const file = path.join(tmpDir, 'test.txt')
    writeFileSync(file, 'content')
  } finally {
    await cleanup()
  }
})
```

**Before** (typical pattern):
```typescript
it('should store data', async () => {
  testCacheDir = mkdtempSync(path.join(os.tmpdir(), 'cacache-test-'))

  // ... test code ...

  // Force delete temp directory outside CWD.
  await del(testCacheDir, { force: true })
})
```

**After** (with helper):
```typescript
it('should store data', async () => {
  const { path: testCacheDir, cleanup } = await withTempDir('cacache-test-')
  try {
    // ... test code ...
  } finally {
    await cleanup()
  }
})
```

**Lines Saved**: ~3-4 lines per temp operation

---

### 3. Platform Test Helpers (`platform-test-helpers.mts`)

**Purpose**: Provides cross-platform testing utilities and conditional test execution.

**Key Functions**:
- `platform` - Platform detection object (`isWindows`, `isUnix`, `isMac`)
- `platformPaths` - Common path patterns for each platform
- `normalizePath(path)` - Normalizes paths for cross-platform comparison
- `expectNormalizedPath(actual, expected)` - Asserts path equality
- `describeOnWindows(name, fn)` - Runs test suite only on Windows
- `describeOnUnix(name, fn)` - Runs test suite only on Unix
- `itOnWindows(name, fn)` - Runs single test only on Windows
- `itOnUnix(name, fn)` - Runs single test only on Unix
- `getPlatformPath(paths)` - Gets appropriate path for current platform
- `isPlatformAbsolute(path)` - Checks if path is absolute on current platform

**Usage Example**:
```typescript
import { platform, itOnWindows, itOnUnix } from '../utils/platform-test-helpers.mts'

describe('path handling', () => {
  itOnWindows('should handle drive letters', () => {
    expect(isRelative('C:\\path')).toBe(false)
  })

  itOnUnix('should handle forward slashes', () => {
    expect(path.sep).toBe('/')
  })
})
```

**Before** (typical pattern):
```typescript
it('should handle Windows paths', () => {
  expect(isRelative('C:\\Windows')).toBe(process.platform !== 'win32')
  if (process.platform === 'win32') {
    expect(isRelative('C:\\path')).toBe(false)
  }
})
```

**After** (with helper):
```typescript
itOnWindows('should handle Windows paths', () => {
  expect(isRelative('C:\\path')).toBe(false)
})
```

**Lines Saved**: ~2-3 lines per platform check

---

### 4. Assertion Helpers (`assertion-helpers.mts`)

**Purpose**: Provides reusable assertion patterns for common type and property checks.

**Key Functions**:
- `expectType(value, expectedType, message)` - Asserts primitive type
- `expectString(value, message)` - Asserts string type
- `expectNumber(value, message)` - Asserts number type
- `expectBoolean(value, message)` - Asserts boolean type
- `expectFunction(value, message)` - Asserts function type
- `expectFrozen(obj, message)` - Asserts object is frozen
- `expectNotFrozen(obj, message)` - Asserts object is not frozen
- `expectSealed(obj, message)` - Asserts object is sealed
- `expectDefined(value, message)` - Asserts value is defined
- `expectTruthy(value, message)` - Asserts value is truthy
- `expectFalsy(value, message)` - Asserts value is falsy
- `expectArrayLength(array, length, message)` - Asserts array length
- `expectInstanceOf(value, constructor, message)` - Asserts instance type
- `expectHasProperty(obj, property, message)` - Asserts property exists
- `expectHasProperties(obj, properties, message)` - Asserts multiple properties
- `expectMatches(value, pattern, message)` - Asserts regex match
- `expectDeepEqual(actual, expected, message)` - Asserts deep equality
- `expectInRange(value, min, max, message)` - Asserts numeric range

**Usage Example**:
```typescript
import { expectString, expectFrozen, expectHasProperties } from '../utils/assertion-helpers.mts'

it('should validate config', () => {
  expectString(config.apiKey)
  expectFrozen(config)
  expectHasProperties(config, ['apiKey', 'baseUrl', 'timeout'])
})
```

**Before** (typical pattern):
```typescript
it('should validate config', () => {
  expect(typeof config.apiKey).toBe('string')
  expect(Object.isFrozen(config)).toBe(true)
  expect(config).toHaveProperty('apiKey')
  expect(config).toHaveProperty('baseUrl')
  expect(config).toHaveProperty('timeout')
})
```

**After** (with helper):
```typescript
it('should validate config', () => {
  expectString(config.apiKey)
  expectFrozen(config)
  expectHasProperties(config, ['apiKey', 'baseUrl', 'timeout'])
})
```

**Lines Saved**: ~1 line per assertion (more readable and maintainable)

---

## Migration Strategy

### Recommended Approach

1. **Use helpers for NEW tests**: All new test files should use these helpers from the start
2. **Refactor incrementally**: When modifying existing tests, convert to use helpers
3. **Focus on high-value files**: Prioritize refactoring files with the most boilerplate

### Files with Highest Refactoring Potential

**Phase 1 - NPM Package Tests** (75 lines total savings):
- safer-buffer.test.mts (599 lines) - ~10 lines saved
- assert.test.mts (545 lines) - ~8 lines saved
- deep-equal.test.mts (608 lines) - ~8 lines saved
- es6-object-assign.test.mts (277 lines) - ~9 lines saved
- harmony-reflect.test.mts (268 lines) - ~8 lines saved
- json-stable-stringify.test.mts (142 lines) - ~8 lines saved
- object-keys.test.mts (193 lines) - ~7 lines saved
- array-flatten.test.mts (170 lines) - ~8 lines saved
- hyrious__bun.lockb.test.mts (47 lines) - ~9 lines saved

**Phase 2 - Temp File Operations** (375 lines total savings):
- isolation.test.mts (574 lines, 39 operations) - ~117 lines saved
- bin.test.mts (1115 lines, 24 operations) - ~72 lines saved
- packages-editable.test.mts (433 lines, 23 operations) - ~69 lines saved
- cacache.test.mts (327 lines, 11 operations) - ~33 lines saved
- packages.test.mts (1345 lines, 7 operations) - ~21 lines saved

**Phase 3 - Platform Checks** (62 lines total savings):
- pnpm-store-path.test.mts (125 lines, 7 checks) - ~14 lines saved
- vlt-cache-path.test.mts (110 lines, 7 checks) - ~14 lines saved
- path.test.mts (1263 lines, 3 checks) - ~6 lines saved
- cache-paths.test.mts (72 lines, 3 checks) - ~6 lines saved
- platform-specific.test.mts (299 lines, 3 checks) - ~6 lines saved

**Phase 4 - Type Assertions** (125 lines total savings):
- 239 typeof assertions across all test files - ~119 lines saved
- 6 frozen checks across test files - ~6 lines saved

### Total Potential Savings

- **Phase 1**: ~75 lines across 9 files
- **Phase 2**: ~375 lines across 18 files
- **Phase 3**: ~62 lines across 10 files
- **Phase 4**: ~125 lines across 25+ files

**Total**: ~637 lines of boilerplate reduction

---

## Best Practices

### 1. Always Clean Up Resources

```typescript
// Good: Guaranteed cleanup
const { path: tmpDir, cleanup } = await withTempDir()
try {
  // Use tmpDir...
} finally {
  await cleanup()
}

// Better: Automatic cleanup with callback
await runWithTempDir(async (tmpDir) => {
  // Use tmpDir... cleanup happens automatically
})
```

### 2. Use Descriptive Prefixes

```typescript
// Good: Clear intent
const { path: cacheDir } = await withTempDir('cacache-test-')
const { path: lockDir } = await withTempDir('lockfile-test-')
```

### 3. Combine Helpers for Maximum Impact

```typescript
import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'
import { runWithTempDir } from '../utils/temp-file-helper.mts'
import { expectString, expectDefined } from '../utils/assertion-helpers.mts'

const { module, skip, eco, sockRegPkgName } = await setupNpmPackageTest(__filename)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('should work', async () => {
    await runWithTempDir(async (tmpDir) => {
      expectString(tmpDir)
      expectDefined(module.someMethod)
      // ... test logic
    })
  })
})
```

### 4. Platform-Specific Tests

```typescript
import { itOnWindows, itOnUnix } from '../utils/platform-test-helpers.mts'

describe('path handling', () => {
  // Run on all platforms
  it('should normalize paths', () => {
    expect(normalizePath('test')).toBeTruthy()
  })

  // Windows-only
  itOnWindows('should handle backslashes', () => {
    expect(path.sep).toBe('\\')
  })

  // Unix-only
  itOnUnix('should handle forward slashes', () => {
    expect(path.sep).toBe('/')
  })
})
```

---

## Testing the Helpers

All helpers are production-ready and include comprehensive JSDoc documentation with examples. To verify:

```bash
# Run type checking
pnpm tsc

# Run linting
pnpm run check:lint

# Run specific tests (once migrated)
pnpm test test/npm/[test-file].test.mts
```

---

## Contributing

When adding new test helpers:

1. **Follow existing patterns**: Use similar naming and structure
2. **Add JSDoc comments**: Include @param, @returns, and @example
3. **Include usage examples**: Show both "before" and "after" patterns
4. **Test the helpers**: Ensure they work in real test scenarios
5. **Update this README**: Document the new helper and its usage

---

## Future Enhancements

Potential additions based on test patterns:

1. **Mock helpers**: Common mocking patterns for APIs, file system, etc.
2. **Fixture helpers**: Loading and managing test fixtures
3. **Async helpers**: Testing promises, timers, and async operations
4. **Network helpers**: HTTP mocking and network condition simulation
5. **Process helpers**: Subprocess testing and environment manipulation

---

For questions or issues with these helpers, refer to the source files which include detailed JSDoc comments and usage examples.
