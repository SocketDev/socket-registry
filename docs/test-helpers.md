# Test Helper Utilities

Reusable test helpers that reduce boilerplate and improve test maintainability across the socket-registry project.

## Available Helpers

### 1. NPM Package Helper (`npm-package-helper.mts`)

**Purpose**: Standardizes NPM package testing setup with automatic installation and skip logic.

**Key Functions**:
- `setupNpmPackageTest(filename)` - Sets up package test environment
- `createNpmPackageBeforeAll(filename, callback)` - Creates beforeAll hook with package setup

**Usage**:
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

**Lines Saved**: ~15-20 lines per file

### 2. Type Checker Helper (`type-checker-helper.mts`)

**Purpose**: Creates comprehensive tests for type-checking functions (is-* packages) with consistent patterns.

**Key Functions**:
- `createTypeCheckerTests(config)` - Generates complete test suite for type checkers
- `createInvalidValuesExcluding(types)` - Creates standard invalid value sets
- `standardInvalidValues` - Common invalid values for type checks

**Usage**:
```typescript
import {
  createTypeCheckerTests,
  createInvalidValuesExcluding,
} from '../utils/type-checker-helper.mts'

createTypeCheckerTests({
  checkerFn: isString,
  typeName: 'String',
  validValues: ['foo', Object('foo')],
  invalidValues: createInvalidValuesExcluding(['string']),
  toStringTagTests: true,
})
```

**Lines Saved**: ~40-50 lines per is-* package test

### 3. Temp File Helper (`temp-file-helper.mts`)

**Purpose**: Manages temporary files and directories with automatic cleanup.

**Key Functions**:
- `withTempDir(prefix)` - Creates temp directory with cleanup
- `withTempDirSync(prefix)` - Synchronous version
- `withTempFile(content, options)` - Creates temp file with content
- `withTempFiles(files, baseDir)` - Creates multiple temp files
- `runWithTempDir(callback, prefix)` - Executes callback with temp dir
- `runWithTempFile(content, callback, options)` - Executes callback with temp file

**Usage**:
```typescript
import { runWithTempDir } from '../utils/temp-file-helper.mts'

it('should work with temp directory', async () => {
  await runWithTempDir(async (tmpDir) => {
    // Use tmpDir... cleanup happens automatically
    const file = path.join(tmpDir, 'test.txt')
    writeFileSync(file, 'content')
  }, 'test-prefix-')
})
```

**Lines Saved**: ~3-4 lines per temp operation

### 4. Platform Test Helpers (`platform-test-helpers.mts`)

**Purpose**: Cross-platform testing utilities and conditional test execution.

**Key Functions**:

**Platform Detection**:
- `platform` - Platform detection object (`isWindows`, `isUnix`, `isMac`)
- `platformPaths` - Common path patterns for each platform

**JavaScript Feature Detection** (NEW):
- `features` - Feature availability object (`hasMap`, `hasSet`, `hasWeakMap`, `hasWeakSet`, `hasSymbol`)
- `itIfMap(name, fn)` - Runs test only when Map is available
- `itIfSet(name, fn)` - Runs test only when Set is available
- `itIfWeakMap(name, fn)` - Runs test only when WeakMap is available
- `itIfWeakSet(name, fn)` - Runs test only when WeakSet is available
- `describeIfMap(name, fn)` - Runs describe block only when Map is available
- `describeIfSet(name, fn)` - Runs describe block only when Set is available

**Path Helpers**:
- `normalizePath(path)` - Normalizes paths for cross-platform comparison
- `expectNormalizedPath(actual, expected)` - Asserts path equality
- `getPlatformPath(paths)` - Gets appropriate path for current platform
- `isPlatformAbsolute(path)` - Checks if path is absolute

**Platform-Specific Tests**:
- `describeOnWindows(name, fn)` - Runs test suite only on Windows
- `describeOnUnix(name, fn)` - Runs test suite only on Unix
- `itOnWindows(name, fn)` - Runs single test only on Windows
- `itOnUnix(name, fn)` - Runs single test only on Unix

**Usage**:
```typescript
import {
  describeIfMap,
  itIfSet,
  itOnWindows,
} from '../utils/platform-test-helpers.mts'

// Feature-conditional tests
describeIfMap('Map operations', () => {
  it('should work with Maps', () => {
    const map = new Map()
    map.set('key', 'value')
    expect(map.get('key')).toBe('value')
  })
})

// Platform-conditional tests
itOnWindows('should handle Windows paths', () => {
  expect(path.sep).toBe('\\')
})
```

**Lines Saved**: ~2-3 lines per feature/platform check

### 5. Assertion Helpers (`assertion-helpers.mts`)

**Purpose**: Reusable assertion patterns for common type and property checks.

**Key Functions**:

**Type Assertions**:
- `expectType(value, expectedType)` - Asserts primitive type
- `expectString(value)` - Asserts string type
- `expectNumber(value)` - Asserts number type
- `expectBoolean(value)` - Asserts boolean type
- `expectFunction(value)` - Asserts function type

**Object State**:
- `expectFrozen(obj)` - Asserts object is frozen
- `expectNotFrozen(obj)` - Asserts object is not frozen
- `expectSealed(obj)` - Asserts object is sealed

**Value Checks**:
- `expectDefined(value)` - Asserts value is defined
- `expectTruthy(value)` - Asserts value is truthy
- `expectFalsy(value)` - Asserts value is falsy

**Structure Checks**:
- `expectArrayLength(array, length)` - Asserts array length
- `expectInstanceOf(value, constructor)` - Asserts instance type
- `expectHasProperty(obj, property)` - Asserts property exists
- `expectHasProperties(obj, properties)` - Asserts multiple properties
- `expectValidPackageStructure(pkgPath, module, type)` (NEW) - Asserts package has valid structure

**Value Comparison**:
- `expectMatches(value, pattern)` - Asserts regex match
- `expectDeepEqual(actual, expected)` - Asserts deep equality
- `expectInRange(value, min, max)` - Asserts numeric range

**Usage**:
```typescript
import {
  expectValidPackageStructure,
  expectString,
  expectFrozen,
  expectHasProperties,
} from '../utils/assertion-helpers.mts'

it('should have valid package structure', () => {
  expectValidPackageStructure(pkgPath, deepEqual, 'function')
})

it('should validate config', () => {
  expectString(config.apiKey)
  expectFrozen(config)
  expectHasProperties(config, ['apiKey', 'baseUrl', 'timeout'])
})
```

**Lines Saved**: ~1 line per assertion (more readable and maintainable)

## Recent Optimizations

### is-regex Test Migration

**Before** (66 lines with manual tests):
```typescript
describe('is-regex', () => {
  it('should return false for non-regexes', () => {
    expect(isRegex()).toBe(false)
    expect(isRegex(null)).toBe(false)
    expect(isRegex(false)).toBe(false)
    // ... 20+ manual checks
  })

  it('should return false for fake regex with @@toStringTag', () => {
    const fakeRegex = {
      [Symbol.toStringTag]: 'RegExp',
    }
    expect(isRegex(fakeRegex)).toBe(false)
  })

  it('should return true for actual regexes', () => {
    expect(isRegex(/a/g)).toBe(true)
    expect(isRegex(/test/)).toBe(true)
  })

  // ... regex-specific edge cases
})
```

**After** (48 lines with helper + edge cases):
```typescript
createTypeCheckerTests({
  checkerFn: isRegex,
  invalidValues: createInvalidValuesExcluding(['regexp']),
  toStringTagTests: true,
  typeName: 'RegExp',
  validValues: [/a/g, /test/, /^[a-z]+$/i],
})

describe('RegExp edge cases', () => {
  it('should not mutate regex lastIndex', () => {
    const regex = /a/
    const marker = {}
    ;(regex as any).lastIndex = marker
    expect(isRegex(regex)).toBe(true)
    expect(regex.lastIndex).toBe(marker)
  })
})
```

**Lines Saved**: 18 lines (27% reduction)

### deep-equal Test Cleanup

**Improvements**:
- Replaced manual package structure test with `expectValidPackageStructure` (3 lines → 1 line)
- Replaced 6 inline `typeof Map !== 'function'` checks with `describeIfMap` (18 lines saved)
- Replaced 3 inline `typeof Set !== 'function'` checks with `describeIfSet` (9 lines saved)

**Total Lines Saved**: 29 lines (~5% reduction in 587-line file)

### Package Structure Tests

**Files Updated**:
- deep-equal.test.mts
- assert.test.mts
- object-keys.test.mts

**Pattern**:
```typescript
// Before (4 lines)
it('should have valid package structure', () => {
  expect(pkgPath).toBeTruthy()
  expect(deepEqual).toBeDefined()
  expect(typeof deepEqual).toBe('function')
})

// After (1 line)
it('should have valid package structure', () => {
  expectValidPackageStructure(pkgPath, deepEqual, 'function')
})
```

**Lines Saved**: 12 lines across 3 files

## Migration Strategy

### Recommended Approach

1. **Use helpers for new tests** - All new test files should use helpers from the start
2. **Refactor incrementally** - When modifying existing tests, convert to use helpers
3. **Focus on high-value files** - Prioritize files with the most boilerplate

### Current Adoption

**Already Using setupNpmPackageTest**: 15 out of 22 NPM tests (68%)

**Already Using createTypeCheckerTests**: 5 tests
- is-string.test.mts
- is-boolean-object.test.mts
- is-date-object.test.mts
- is-number-object.test.mts
- is-regex.test.mts (NEW)

**Already Using Feature Detection Helpers**: 1 test
- deep-equal.test.mts (describeIfMap, describeIfSet)

**Already Using expectValidPackageStructure**: 3 tests
- deep-equal.test.mts
- assert.test.mts
- object-keys.test.mts

## Best Practices

### Always Clean Up Resources

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

### Use Descriptive Prefixes

```typescript
// Good: Clear intent
const { path: cacheDir } = await withTempDir('cacache-test-')
const { path: lockDir } = await withTempDir('lockfile-test-')
```

### Combine Helpers for Maximum Impact

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

### Feature-Conditional Tests

```typescript
import { describeIfMap, itIfSet } from '../utils/platform-test-helpers.mts'

// Entire describe block conditional
describeIfMap('Map operations', () => {
  it('should create a map', () => {
    const map = new Map()
    expect(map).toBeDefined()
  })
})

// Individual test conditional
itIfSet('should work with Sets', () => {
  const set = new Set([1, 2, 3])
  expect(set.has(2)).toBe(true)
})
```

## Testing the Helpers

All helpers include comprehensive JSDoc documentation with examples.

```bash
# Run type checking
pnpm run check

# Run linting
pnpm run lint

# Run specific tests
pnpm test test/npm/[test-file].test.mts
```

## Contributing

When adding new test helpers:

1. **Follow existing patterns** - Use similar naming and structure
2. **Add JSDoc comments** - Include @param, @returns, and @example
3. **Include usage examples** - Show both "before" and "after" patterns
4. **Test the helpers** - Ensure they work in real test scenarios
5. **Update this document** - Document the new helper and its usage

## Future Enhancements

Potential additions based on test patterns:

1. **Mock helpers** - Common mocking patterns for APIs, file system, etc.
2. **Fixture helpers** - Loading and managing test fixtures
3. **Async helpers** - Testing promises, timers, and async operations
4. **Network helpers** - HTTP mocking and network condition simulation
5. **Process helpers** - Subprocess testing and environment manipulation

For questions or issues, refer to the source files which include detailed JSDoc comments.
