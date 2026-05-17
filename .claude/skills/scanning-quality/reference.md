# quality-scan Reference Documentation

## Table of Contents

- [Core Principles](#core-principles)
- [Agent Prompts](#agent-prompts)
- [Scan Configuration](#scan-configuration)
- [Report Format](#report-format)
- [Edge Cases](#edge-cases)
- [Scan Errors](#scan-errors)
- [Security Scan Agent](#security-scan-agent)
- [Workflow Optimization Scan Agent](#workflow-optimization-scan-agent)
- [Documentation Scan Agent](#documentation-scan-agent)

## Core Principles

### KISS (Keep It Simple, Stupid)

**Always prioritize simplicity** - the simpler the code, the fewer bugs it will have.

Common violations to flag:
- **Over-abstraction**: Creating utilities, helpers, or wrappers for one-time operations
- **Premature optimization**: Complex caching, memoization, or performance tricks before profiling
- **Unnecessary indirection**: Multiple layers of function calls when direct code would be clearer
- **Complex path construction**: Building paths manually instead of using helper return values
- **Feature creep**: Adding "nice to have" features that complicate the core logic

Examples:

**BAD - Ignoring return values and reconstructing paths:**
```javascript
await downloadAsset({ asset, downloadDir, tool: 'package' })
const downloadedPath = path.join(downloadDir, 'package', 'assets', asset)  // ❌ Assumes path structure
```

**GOOD - Use the return value:**
```javascript
const downloadedPath = await downloadAsset({ asset, downloadDir })  // ✅ Simple, trust the function
```

**Principle**: If a function returns what you need, use it. Don't reconstruct or assume.

## Agent Prompts

### Critical Scan Agent

**Mission**: Identify critical bugs that could cause crashes, data corruption, or security vulnerabilities.

**Scan Targets**: All `.mts` files in `src/`

**Prompt Template:**
```
Your task is to perform a critical bug scan on the codebase. Identify bugs that could cause crashes, data corruption, or security vulnerabilities.

<context>
[CONDITIONAL: Adapt this context based on the repository you're scanning]

Common characteristics to look for:
- TypeScript/JavaScript files (.ts, .mts, .mjs, .js)
- Async operations and promise handling
- External API integrations
- File system operations
- Cross-platform compatibility requirements
- Error handling patterns
- Resource management (connections, file handles, timers)
</context>

<instructions>
Scan all code files for these critical bug patterns:
- [IF monorepo] TypeScript/JavaScript: packages/npm/*/scripts/**/*.{mjs,mts}, registry/lib/**/*.js, scripts/**/*.{mjs,mts}
- [IF single package] TypeScript/JavaScript: src/**/*.{ts,mts,mjs,js}, lib/**/*.{ts,mts,mjs,js}
- Focus on:

<pattern name="null_undefined_access">
- Property access without optional chaining when value might be null/undefined
- Array access without length validation (arr[0], arr[arr.length-1])
- JSON.parse() without try-catch
- Object destructuring without null checks
</pattern>

<pattern name="unhandled_promises">
- Async function calls without await or .catch()
- Promise.then() chains without .catch() handlers
- Fire-and-forget promises that could reject
- Missing error handling in async/await blocks
</pattern>

<pattern name="race_conditions">
- Concurrent file system operations without coordination
- Parallel cache reads/writes without synchronization
- Check-then-act patterns without atomic operations
- Shared state modifications in Promise.all()
</pattern>

<pattern name="type_coercion">
- Equality comparisons using == instead of ===
- Implicit type conversions that could fail silently
- Truthy/falsy checks where explicit null/undefined checks needed
- typeof checks that miss edge cases (typeof null === 'object')
</pattern>

<pattern name="resource_leaks">
- File handles opened but not closed (missing .close() or using())
- Timers created but not cleared (setTimeout/setInterval)
- Event listeners added but not removed
- Memory accumulation in long-running processes
</pattern>

<pattern name="buffer_overflow">
- String slicing without bounds validation
- Array indexing beyond length
- Buffer operations without size checks
</pattern>

For each bug found, think through:
1. Can this actually crash in production?
2. What input would trigger it?
3. Is there existing safeguards I'm missing?
</instructions>

<output_format>
For each finding, report:

File: src/path/to/file.mts:lineNumber
Issue: [One-line description of the bug]
Severity: Critical
Pattern: [The problematic code snippet]
Trigger: [What input/condition causes the bug]
Fix: [Specific code change to fix it]
Impact: [What happens if this bug is triggered]

Example:
File: src/path/to/file.mjs:145
Issue: Unhandled promise rejection in async operation
Severity: Critical
Pattern: `await asyncOperation()`
Trigger: When operation fails without error handling
Fix: `await asyncOperation().catch(err => { logger.error(err); throw new Error(\`Operation failed: \${err.message}\`) })`
Impact: Uncaught exception crashes process

</output_format>

<quality_guidelines>
- Only report actual bugs, not style issues or minor improvements
- Verify bugs are not already handled by surrounding code
- Prioritize bugs affecting reliability and correctness
- For TypeScript: Focus on promise handling, type guards, external input validation
- Skip false positives (TypeScript type guards are sufficient in many cases)
- [IF monorepo] Scan across all packages systematically
- [IF single package] Scan all source directories (src/, lib/, scripts/)
</quality_guidelines>

Scan systematically and report all critical bugs found. If no critical bugs are found, state that explicitly.
```

---

### Logic Scan Agent

**Mission**: Detect logical errors in algorithms, data processing, and business logic that could produce incorrect output or incorrect behavior.

**Scan Targets**: All source code files

**Prompt Template:**
```
Your task is to detect logic errors in the codebase that could produce incorrect output or incorrect behavior. Focus on algorithm correctness, edge case handling, and data validation.

<context>
[CONDITIONAL: Adapt this context based on the repository you're scanning]

Common areas to analyze:
- Algorithm implementation and correctness
- Data parsing and transformation logic
- Input validation and sanitization
- Edge case handling
- Cross-platform compatibility
- Business logic implementation
</context>

<instructions>
Analyze code for these logic error patterns:

<pattern name="off_by_one">
Off-by-one errors in loops and slicing:
- Loop bounds: `i <= arr.length` should be `i < arr.length`
- Slice operations: `arr.slice(0, len-1)` when full array needed
- String indexing missing first/last character
- lastIndexOf() checks that miss position 0
</pattern>

<pattern name="type_guards">
Insufficient type validation:
- `if (obj)` allows 0, "", false - use `obj != null` or explicit checks
- `if (arr.length)` crashes if arr is undefined - check existence first
- `typeof x === 'object'` true for null and arrays - use Array.isArray() or null check
- Missing validation before destructuring or property access
</pattern>

<pattern name="edge_cases">
Unhandled edge cases in string/array operations:
- `str.split('.')[0]` when delimiter might not exist
- `parseInt(str)` without NaN validation
- `lastIndexOf('@')` returns -1 if not found, === 0 is valid (e.g., '@package')
- Empty strings, empty arrays, single-element arrays
- Malformed input handling (missing try-catch, no fallback)
</pattern>

<pattern name="algorithm_correctness">
Algorithm implementation issues:
- [IF parsing logic exists] Parsing: Header/format validation, delimiter handling errors
- Version comparison: Failing on semver edge cases (prerelease, build metadata)
- Path resolution: Symlink handling, relative vs absolute path logic
- File ordering: Incorrect dependency ordering in sequences
- Deduplication: Missing deduplication of duplicate items
</pattern>

Before reporting, think through:
1. Does this logic error produce incorrect output?
2. What specific input would trigger it?
3. Is the error already handled elsewhere?
</instructions>

<output_format>
For each finding, report:

File: src/path/to/file.mts:lineNumber
Issue: [One-line description]
Severity: High | Medium
Edge Case: [Specific input that triggers the error]
Pattern: [The problematic code snippet]
Fix: [Corrected code]
Impact: [What incorrect output is produced]

Example:
File: src/path/to/file.mjs:89
Issue: Off-by-one in array iteration
Severity: High
Edge Case: When array has trailing elements
Pattern: `for (let i = 0; i < items.length - 1; i++)`
Fix: `for (let i = 0; i < items.length; i++)`
Impact: Last item is silently omitted, causing incorrect processing

</output_format>

<quality_guidelines>
- Prioritize code handling external data (user input, file parsing, API responses)
- Focus on errors affecting correctness and data integrity
- Verify logic errors aren't false alarms due to type narrowing
- Consider real-world edge cases: malformed input, unusual formats, cross-platform paths
</quality_guidelines>

Analyze systematically and report all logic errors found. If no errors are found, state that explicitly.
```

---

### Cache Scan Agent

**Mission**: Identify caching bugs that cause stale data, cache corruption, or incorrect behavior.

**Scan Targets**: Caching logic across the codebase (if applicable)

**Prompt Template:**
```
Your task is to analyze caching implementation for correctness, staleness bugs, and performance issues. Focus on cache corruption, invalidation failures, and race conditions.

<context>
[CONDITIONAL: Adapt for your repository's caching strategy]

This project uses caching for npm package overrides and registry data:
- **Storage**: Package override caching in packages/npm/*
- **Invalidation**: Based on package versions and registry URLs
- **Cross-platform**: Must work on Windows, macOS, Linux
- **Critical**: Stale cache can cause incorrect package resolution

Caching locations (if applicable):
- registry/lib/ - Registry interaction caching
- Build cache for overrides
- Cache key generation and validation logic
</context>

<instructions>
Analyze caching implementation for these issue categories:

<pattern name="cache_invalidation">
Stale checkpoints from incorrect invalidation:
- Patch changes: Are patch file hashes included in cache key?
- Source version: Is Node.js version properly included in cache key?
- Config changes: Are build flags (debug/release, ICU settings) in cache key?
- Cross-platform: Are platform/arch properly isolated (darwin-arm64 vs linux-x64)?
- Restoration: Is checkpoint validated before restoration (corrupted archives)?
- Race: Checkpoint modified/deleted between validation and restoration?
</pattern>

<pattern name="cache_keys">
Checkpoint key generation correctness:
- Hash collisions: Is hash function sufficient for patch content?
- Patch ordering: Does key depend on patch application order?
- Platform isolation: Are Windows/macOS/Linux checkpoints properly separated?
- Arch isolation: Are ARM64/x64 checkpoints kept separate?
- Dependencies: Are dependency changes invalidating caches?
- Environment: Are env vars (NODE_OPTIONS, etc.) affecting builds included?

**NOTE**: Platform-agnostic operations (npm package parsing) may share cache keys across platforms,
while platform-specific operations (binary builds) should include platform/arch in cache keys.
</pattern>

<pattern name="checkpoint_corruption">
Checkpoint archive corruption:
- Partial writes: tar.gz creation interrupted, incomplete archive
- Disk full: Archive truncated due to disk space issues
- Extraction failures: Corrupted archive extracted partially
- Overwrite races: Concurrent builds overwriting same checkpoint
- Cleanup races: Checkpoint deleted while being restored
</pattern>

<pattern name="concurrency">
Race conditions in checkpoint operations:
- Creation races: Multiple builds creating same checkpoint simultaneously
- Restoration races: Checkpoint deleted/modified during restoration
- Validation races: Checkpoint validated then corrupted before use
- Directory conflicts: Concurrent builds using same build directory
- Lock files: Missing lock files allowing concurrent checkpoint access
</pattern>

<pattern name="stale_checkpoints">
Scenarios producing stale/incorrect checkpoints:
- Patch modified but checkpoint not invalidated (hash not updated)
- Platform mismatch: Restoring darwin checkpoint on linux
- Arch mismatch: Restoring arm64 checkpoint for x64 build
- Version mismatch: Node.js version changed but checkpoint reused
- Dependencies changed: Updated dependencies but checkpoint not invalidated
- Environment drift: Build flags changed but cache key unchanged
</pattern>

<pattern name="edge_cases">
Uncommon scenarios:
- Empty files (zero bytes) - cached correctly?
- File deletion while cached - stale entry persists?
- Rapid successive reads/writes (stress testing)
- Very large files exceeding maxEntrySize
- Permission changes during caching
</pattern>

Think through each issue:
1. Can this actually happen in production?
2. What observable behavior results?
3. How likely/severe is the impact?
</instructions>

<output_format>
For each finding, report:

File: registry/lib/cache-module.js:lineNumber
Issue: [One-line description]
Severity: High | Medium
Scenario: [Step-by-step sequence showing how bug manifests]
Pattern: [The problematic code snippet]
Fix: [Specific code change]
Impact: [Observable effect - wrong output, performance, crash]

Example:
File: registry/lib/cache-module.js:145
Issue: Cache key missing package version hashes
Severity: High
Scenario: 1) Build with patch v1, creates checkpoint. 2) Patch file modified to v2 (same filename). 3) Build restores v1 checkpoint. 4) Produces binary with v1 patches but v2 expected
Pattern: `const cacheKey = \`\${nodeVersion}-\${platform}-\${arch}\``
Fix: `const patchHashes = await hashAllPatches(); const cacheKey = \`\${nodeVersion}-\${platform}-\${arch}-\${patchHashes}\``
Impact: Stale checkpoints produce incorrect Node.js binaries with wrong patches applied
</output_format>

<quality_guidelines>
- Focus on correctness issues that produce wrong builds or corrupted checkpoints
- Consider cross-platform differences (Windows, macOS, Linux)
- Evaluate checkpoint invalidation scenarios (patches changed, additions changed)
- Prioritize issues causing silent build incorrectness over performance
- Verify issues aren't prevented by existing cache key generation
</quality_guidelines>

Analyze the checkpoint implementation thoroughly across all checkpoint stages and report all issues found. If the implementation is sound, state that explicitly.
```

---

### Workflow Scan Agent

**Mission**: Detect problems in build scripts, CI configuration, git hooks, and developer workflows across the socket-registry monorepo.

**Scan Targets**: All `scripts/`, `package.json`, `.git-hooks/*`, `.husky/*`, `.github/workflows/*` across packages

**Prompt Template:**
```
Your task is to identify issues in socket-registry's development workflows, build scripts, and CI configuration that could cause build failures, test flakiness, or poor developer experience.

<context>
socket-registry is a pnpm monorepo with:
- **npm packages**: packages/npm/* (override packages published to npm)
- **Build scripts**: scripts/**/*.{mjs,mts} (ESM, cross-platform Node.js)
- **Package manager**: pnpm workspaces with scripts in each package.json
- **Git hooks**: .git-hooks/* and .husky/* for pre-commit, pre-push validation
- **CI**: GitHub Actions (.github/workflows/) - reusable workflows consumed by other repos
- **Platforms**: Must work on Windows, macOS, Linux
- **CLAUDE.md**: Defines conventions (no process.exit(), no backward compat, etc.)
- **Critical**: Build scripts generate npm override packages - must handle errors gracefully

Key directories:
- packages/npm/ - Override npm packages
- registry/lib/ - Registry library code
- scripts/ - Build and maintenance scripts
</context>

<instructions>
Analyze workflow files for these issue categories:

<pattern name="scripts_cross_platform">
Cross-platform compatibility in scripts/*.mjs:
- Path separators: Hardcoded / or \ instead of path.join() or path.resolve()
- Shell commands: Platform-specific (e.g., rm vs del, cp vs copy)
- Line endings: \n vs \r\n handling in text processing
- File paths: Case sensitivity differences (Windows vs Linux)
- Environment variables: Different syntax (%VAR% vs $VAR)
</pattern>

<pattern name="scripts_errors">
Error handling in scripts:
- process.exit() usage: CLAUDE.md forbids this - should throw errors instead
- Missing try-catch: Async operations without error handling
- Exit codes: Non-zero exit on failure for CI detection
- Error messages: Are they helpful for debugging?
- Dependency checks: Do scripts check for required tools before use?

**Note on file existence checks**: existsSync() is ACCEPTABLE and actually PREFERRED over async fs.access() for synchronous file checks. Node.js has quirks where the synchronous check is more reliable for immediate validation. Do NOT flag existsSync() as an issue.
</pattern>

<pattern name="import_conventions">
Import style conventions (Socket Security standards):
- Use `@socketsecurity/lib/logger` instead of custom log functions or cherry-picked console methods
- Use `@socketsecurity/lib/spawn` instead of `node:child_process`
- For Node.js built-in modules: **Cherry-pick fs, default import path/os/url/crypto**
  - For `fs`: cherry-pick sync methods, use promises namespace for async
  - For `child_process`: **avoid direct usage** - prefer `@socketsecurity/lib/spawn`
  - For `path`, `os`, `url`, `crypto`: use default imports
  - Examples:
    - `import { existsSync, promises as fs } from 'node:fs'` ✅
    - `import { spawn } from '@socketsecurity/lib/spawn'` ✅ (preferred over node:child_process)
    - `import path from 'node:path'` ✅
    - `import os from 'node:os'` ✅
    - `import { fileURLToPath } from 'node:url'` ✅ (exception: cherry-pick specific exports from url)
- Prefer standard library patterns over custom implementations

Examples of what to flag:
- Custom log functions: `function log(msg) { console.log(msg) }` → use `@socketsecurity/lib/logger`
- Direct child_process usage:
  - `import { execSync } from 'node:child_process'` → use `import { spawn } from '@socketsecurity/lib/spawn'`
  - `execSync('cmd arg1')` → use `await spawn('cmd', ['arg1'])`
- Default imports for fs:
  - `import fs from 'node:fs'` → use `import { existsSync, promises as fs } from 'node:fs'`
- Cherry-picking from path/os:
  - `import { join, resolve } from 'node:path'` → use `import path from 'node:path'`
  - `import { platform, arch } from 'node:os'` → use `import os from 'node:os'`
- Wrong async imports: `import { readFile } from 'node:fs/promises'` → use `import { promises as fs } from 'node:fs'`

Why this matters:
- Consistent logging across all packages (formatting, levels, CI integration)
- @socketsecurity/lib/spawn provides better error handling and cross-platform support than raw child_process
- Cherry-picked fs methods are explicit and tree-shakeable
- Promises namespace clearly distinguishes async operations from sync
- Default imports for path/os/crypto show which module provides the function
- Easier refactoring and IDE navigation
- Avoids naming conflicts
</pattern>

<pattern name="package_json_scripts">
package.json script correctness:
- Script chaining: Use && (fail fast) not ; (continue on error) when errors matter
- Platform-specific: Commands that don't work cross-platform (grep, find, etc.)
- Convention compliance: Match patterns in CLAUDE.md (e.g., `pnpm run foo --flag` not `foo:bar`)
- Missing scripts: Standard scripts like build, test, lint documented?
</pattern>

<pattern name="git_hooks">
Git hooks configuration:
- Pre-commit: Does it run linting/formatting? Is it fast (<10s)?
- Pre-push: Does it run tests to prevent broken pushes?
- False positives: Do hooks block legitimate commits?
- Error messages: Are hook failures clearly explained?
- Hook installation: Is setup documented in README?
</pattern>

<pattern name="ci_configuration">
CI pipeline issues:
- Build order: Are steps in correct sequence (install → build → test)?
- Cross-platform: Are Windows/macOS/Linux builds all tested?
- Build artifacts: Are npm packages built and published correctly?
- Caching: Are node_modules and build outputs cached across CI runs?
- Failure notifications: Are build failures clearly visible?
- Node.js versions: Are multiple Node.js versions tested?
- Reusable workflows: Are workflow inputs and outputs documented?
</pattern>

<pattern name="developer_experience">
Documentation and setup:
- Common errors: Are frequent issues documented with solutions?
- Environment variables: Are required env vars documented?
</pattern>

<pattern name="build_infrastructure">
Build script architecture (CRITICAL for consistent package builds):

**Package Build Entry Points:**
- Use `pnpm run build` as the build entry point
- Build scripts in `scripts/` handle package generation and validation

**Common mistakes to flag:**
1. Missing pnpm wrapper:
   - Bug: Running scripts directly instead of through pnpm
   - Fix: Use `pnpm run build` or `pnpm --filter <package> build`

2. Missing error handling in build scripts:
   - Bug: Build script doesn't validate outputs
   - Fix: Add validation after each build step

**Check these files:**
- scripts/ - Build and maintenance scripts
- packages/npm/*/package.json - Override package definitions
</pattern>

For each issue, consider:
1. Does this actually affect developers or CI?
2. How often would this be encountered?
3. Is there a simple fix?
</instructions>

<output_format>
For each finding, report:

File: [scripts/foo.mjs:line OR package.json:scripts.build OR .github/workflows/ci.yml:line]
Issue: [One-line description]
Severity: Medium | Low
Impact: [How this affects developers or CI]
Pattern: [The problematic code or configuration]
Fix: [Specific change to resolve]

Example:
File: scripts/build.mjs:23
Issue: Uses process.exit() violating CLAUDE.md convention
Severity: Medium
Impact: Cannot be tested properly, unconventional error handling
Pattern: `process.exit(1)`
Fix: `throw new Error('Build failed: ...')`

Example:
File: package.json:scripts.test
Issue: Script chaining uses semicolon instead of &&
Severity: Medium
Impact: Tests run even if build fails, masking build issues
Pattern: `"test": "pnpm build ; pnpm vitest"`
Fix: `"test": "pnpm build && pnpm vitest"`
</output_format>

<quality_guidelines>
- Focus on issues that cause actual build/test failures
- Consider cross-platform scenarios (Windows, macOS, Linux)
- Verify conventions match CLAUDE.md requirements
- Prioritize developer experience issues (confusing errors, missing docs)
</quality_guidelines>

Analyze workflow files systematically and report all issues found. If workflows are well-configured, state that explicitly.
```

---

## Scan Configuration

### Severity Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| **Critical** | Crashes, security vulnerabilities, data corruption | Fix immediately |
| **High** | Logic errors, incorrect output, resource leaks | Fix before release |
| **Medium** | Performance issues, edge case bugs | Fix in next sprint |
| **Low** | Code smells, minor inconsistencies | Fix when convenient |

### Scan Priority Order

1. **critical** - Most important, run first
2. **logic** - Parser correctness critical for SBOM accuracy
3. **cache** - Performance and correctness
4. **workflow** - Developer experience

### Coverage Targets

- **critical**: All src/ files
- **logic**: src/parsers/ (19 ecosystems) + src/util/
- **cache**: src/util/file-cache.mts + related
- **workflow**: scripts/, package.json, .git-hooks/, CI

---

## Report Format

### Structured Findings

Each finding should include:
```typescript
{
  file: "src/util/file-cache.mts:89",
  issue: "Potential race condition in cache update",
  severity: "High",
  scanType: "cache",
  pattern: "if (cached) { /* check-then-act */ }",
  suggestion: "Use atomic operations or locking",
  impact: "Could return stale data under concurrent access"
}
```

### Example Report Output

```markdown
# Quality Scan Report

**Date:** 2026-02-05
**Scans:** critical, logic, cache, workflow
**Files Scanned:** 127
**Findings:** 2 critical, 5 high, 8 medium, 3 low

## Critical Issues (Priority 1) - 2 found

### src/util/file-cache.mts:89
- **Issue**: Potential null pointer access on cache miss
- **Pattern**: `const stats = await fs.stat(normalizedPath)`
- **Fix**: Add try-catch or check file existence first
- **Impact**: Crashes when file deleted between cache check and stat

### src/parsers/npm/index.mts:234
- **Issue**: Unhandled promise rejection
- **Pattern**: `parsePackageJson(path)` without await or .catch()
- **Fix**: Add await or .catch() handler
- **Impact**: Uncaught exception crashes process

## High Issues (Priority 2) - 5 found

### src/parsers/pypi/index.mts:512
- **Issue**: Off-by-one error in bracket depth calculation
- **Pattern**: `bracketDepth - 1` can go negative
- **Fix**: Use `Math.max(0, bracketDepth - 1)`
- **Impact**: Incorrect dependency parsing for malformed files

...

## Scan Coverage
- **Critical scan**: 127 files analyzed in src/
- **Logic scan**: 19 parsers + 15 utils analyzed
- **Cache scan**: 1 file + related code paths
- **Workflow scan**: 12 scripts + package.json + 3 hooks

## Recommendations
1. Address 2 critical issues immediately before next release
2. Review 5 high-severity logic errors in parsers
3. Schedule medium issues for next sprint
4. Low-priority items can be addressed during refactoring
```

---

## Edge Cases

### No Findings

If scan finds no issues:
```markdown
# Quality Scan Report

**Result**: ✓ No issues found

All scans completed successfully with no findings.

- Critical scan: ✓ Clean
- Logic scan: ✓ Clean
- Cache scan: ✓ Clean
- Workflow scan: ✓ Clean

**Code quality**: Excellent
```

### Scan Failures

If an agent fails or times out:
```markdown
## Scan Errors

- **critical scan**: ✗ Failed (agent timeout)
  - Retry recommended
  - Check agent prompt size

- **logic scan**: ✓ Completed
- **cache scan**: ✓ Completed
- **workflow scan**: ✓ Completed
```

### Partial Scans

User can request specific scan types:
```bash
# Only run critical and logic scans
quality-scan --types critical,logic
```

Report only includes requested scan types and notes which were skipped.

---

## Security Scan Agent

**Mission**: Scan GitHub Actions workflows for security vulnerabilities using zizmor.

**Scan Targets**: All `.yml` files in `.github/workflows/`

**Prompt Template:**
```
Your task is to run the zizmor security scanner on GitHub Actions workflows to identify security vulnerabilities such as template injection, cache poisoning, and other workflow security issues.

<context>
Zizmor is a GitHub Actions workflow security scanner that detects:
- Template injection vulnerabilities (code injection via template expansion)
- Cache poisoning attacks (artifacts vulnerable to cache poisoning)
- Credential exposure in workflow logs
- Dangerous workflow patterns and misconfigurations
- OIDC token abuse risks
- Artipacked vulnerabilities

This repository uses GitHub Actions for CI/CD with workflows in `.github/workflows/`.

**Installation:**
Zizmor is not an npm package. See `_shared/security-tools.md` for detection and `external-tools.json` for the pinned version. Install via `pnpm run setup`.
</context>

<instructions>
1. Run zizmor on all GitHub Actions workflow files:
   ```bash
   zizmor .github/workflows/
   ```

2. Parse the zizmor output and identify all findings:
   - Extract severity level (info, low, medium, high, error)
   - Extract vulnerability type (template-injection, cache-poisoning, etc.)
   - Extract file path and line numbers
   - Extract audit confidence level
   - Note if auto-fix is available

3. For each finding, report:
   - File and line number
   - Vulnerability type and severity
   - Description of the security issue
   - Why it's a problem (security impact)
   - Suggested fix (use zizmor's suggestions if available)
   - Whether auto-fix is available (`zizmor --fix`)

4. If zizmor reports no findings, state explicitly: "✓ No security issues found in GitHub Actions workflows"

5. Note any suppressed findings (shown by zizmor but marked as suppressed)
</instructions>

<pattern name="template_injection">
Look for findings like:
- `info[template-injection]` or `error[template-injection]`
- Code injection via template expansion in run blocks
- Unsanitized use of `${{ }}` syntax in dangerous contexts
- User-controlled input used in shell commands
</pattern>

<pattern name="cache_poisoning">
Look for findings like:
- `error[cache-poisoning]` or `warning[cache-poisoning]`
- Caching enabled when publishing artifacts
- Vulnerable to cache poisoning attacks in release workflows
- actions/setup-node or actions/setup-python with cache enabled during artifact publishing
</pattern>

<pattern name="credential_exposure">
Look for findings like:
- Secrets logged to console
- Credentials passed in insecure ways
- Token leakage through workflow logs
</pattern>

<output_format>
For each finding, output in this structured format:

{
  file: ".github/workflows/workflow-name.yml:123",
  issue: "Template injection vulnerability in run block",
  severity: "High",
  scanType: "security",
  pattern: "run: echo ${{ github.event.comment.body }}",
  trigger: "Untrusted user input from PR comment",
  fix: "Use environment variables: env: COMMENT: ${{ github.event.comment.body }} then echo \"$COMMENT\"",
  impact: "Attacker can execute arbitrary code in CI environment",
  autofix: true
}

Group findings by severity (Error → High → Medium → Low → Info)
</output_format>

<quality_guidelines>
- Only report actual zizmor findings (don't invent issues)
- Include all details from zizmor output
- Note the audit confidence level for each finding
- Indicate if auto-fix is available
- If no findings, explicitly state the workflows are secure
- Report suppressed findings separately
</quality_guidelines>
```

### Example Security Scan Output

```markdown
## Security Issues - 2 found

### .github/workflows/ci.yml:45
- **Issue**: Template injection in run block
- **Severity**: High
- **Pattern**: `echo "User comment: ${{ github.event.comment.body }}"`
- **Trigger**: Untrusted PR comment body injected into shell command
- **Fix**: Use environment variable: `env: COMMENT: ${{ github.event.comment.body }}` then `echo "User comment: $COMMENT"`
- **Impact**: Attacker can execute arbitrary commands in CI by crafting malicious PR comment
- **Auto-fix**: Available (`zizmor --fix`)
- **Confidence**: High

### .github/workflows/release.yml:89
- **Issue**: Cache poisoning vulnerability when publishing artifacts
- **Severity**: Medium
- **Pattern**: `actions/setup-node@v4` with `cache: 'npm'` in release workflow
- **Trigger**: Dependency cache enabled in workflow that publishes release artifacts
- **Fix**: Disable cache: `cache: ''` or remove cache parameter when publishing
- **Impact**: Attacker could poison dependency cache and inject malicious code into releases
- **Auto-fix**: Not available
- **Confidence**: Low
```

---

## Workflow Optimization Scan Agent

**Mission**: Verify GitHub Actions workflows optimize CI time by using proper caching, conditional steps, and avoiding redundant work.

**Scan Targets**: All `.github/workflows/*.yml` files

**Prompt Template:**
```
Your task is to verify GitHub Actions workflows properly optimize CI time by using caching, conditional steps, and avoiding redundant installations.

<context>
**Why Workflow Optimization Matters:**
CI workflows waste significant time when they don't leverage caching or skip unnecessary steps.

**socket-registry CI Structure:**
socket-registry provides reusable GitHub Actions workflows consumed by other Socket repos:
- Reusable workflows in `.github/workflows/` with `workflow_call` triggers
- Package build and test workflows
- Publishing workflows for npm packages

**Expected Patterns:**
- Cache node_modules and pnpm store across runs
- Skip build steps when outputs are cached
- Use `if` conditions to skip unnecessary platform-specific steps
</context>

<instructions>
Systematically verify all workflows optimize CI time:

**Step 1: Identify workflows with caching**
```bash
ls .github/workflows/*.yml
```

**Step 2: For each workflow, check:**
1. Is pnpm store cached? (`actions/cache` or `pnpm/action-setup` with cache)
2. Are build outputs cached when possible?
3. Are installation steps conditional on cache misses?

**Step 3: Verify optimization patterns:**

<pattern name="missing_cache">
Workflows that install dependencies without caching:
```yaml
# BAD - no caching
- run: pnpm install

# GOOD - with pnpm store cache
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
  with:
    cache: 'pnpm'
- run: pnpm install
```
</pattern>

<pattern name="redundant_steps">
Steps that run unconditionally but could be skipped:
- Installation steps that re-run even when cached
- Build steps that re-run even when outputs exist
- Test setup that duplicates other workflow steps
</pattern>

<pattern name="reusable_workflow_issues">
Reusable workflow problems:
- Missing required inputs documentation
- Outputs not properly propagated to callers
- Secrets not passed through correctly
</pattern>

For each issue found:
1. Identify the workflow file and line number
2. Show the current configuration
3. Explain the optimization opportunity
4. Provide the corrected configuration
5. Estimate time savings from the fix
</instructions>

<output_format>
For each finding, report:

File: .github/workflows/workflow-name.yml:line
Issue: [One-line description]
Severity: Medium
Impact: Wastes N seconds/minutes per CI run
Pattern: [current configuration]
Fix: [corrected configuration]
Savings: Estimated ~N seconds per CI run

Example:
File: .github/workflows/ci.yml:45
Issue: pnpm store not cached across runs
Severity: Medium
Impact: Wastes 30-60 seconds reinstalling dependencies on each run
Pattern: Missing `cache: 'pnpm'` in setup-node step
Fix: Add `cache: 'pnpm'` to actions/setup-node configuration
Savings: ~45 seconds per CI run
</output_format>

<quality_guidelines>
- Only report steps where caching or conditions would provide real savings
- Don't report steps that genuinely need to run every time
- If all workflows are optimized, state that explicitly
- Group findings by workflow file
</quality_guidelines>

Systematically analyze all workflows and report all missing optimizations. If workflows are fully optimized, state: "All workflows properly optimize CI time."
```

---

## Documentation Scan Agent

**Mission**: Verify documentation accuracy by checking README files, code comments, and examples against actual codebase implementation.

**Scan Targets**: All README.md files, documentation files, and inline code examples

**Prompt Template:**
```
Your task is to verify documentation accuracy across all README files and documentation by comparing documented behavior, examples, commands, and API descriptions against the actual codebase implementation.

<context>
Documentation accuracy is critical for:
- Developer onboarding and productivity
- Preventing confusion from outdated examples
- Maintaining trust in the project documentation
- Reducing support burden from incorrect instructions

Common documentation issues:
- Package names that don't match package.json
- Command examples with incorrect flags or options
- API documentation showing methods that don't exist
- File paths that are incorrect or outdated
- Build outputs documented in wrong locations
- Configuration examples using deprecated formats
- Missing documentation for new features
- Examples that would fail if run as-is
</context>

<instructions>
Systematically verify all README files and documentation against the actual code:

1. **Find all documentation files**:
   ```bash
   find . -name "README.md" -o -name "*.md" -path "*/docs/*"
   ```

2. **For each README, verify**:
   - Package names match package.json "name" field
   - Command examples use correct flags (check --help output or source)
   - File paths exist and match actual structure
   - Build output paths match actual build script outputs
   - API examples match actual exported functions/types
   - Configuration examples match actual schema/validation
   - Version numbers are current (not outdated)

3. **Check against actual code**:
   - Read package.json to verify names, scripts, dependencies
   - Read source files to verify APIs, exports, types
   - Check build scripts to verify output paths
   - Verify CLI --help matches documented flags
   - Check tests to see what's actually supported

4. **Pattern categories to check**:

<pattern name="package_names">
Look for:
- README showing @scope/package when package.json has no scope
- README showing package-name when package.json shows different name
- Installation instructions with wrong package names
- Import examples using wrong package names
</pattern>

<pattern name="command_examples">
Look for:
- Commands with flags that don't exist (check --help)
- Missing required flags in examples
- Deprecated flags still documented
- Examples that would error if run as-is
- Wrong command names (typos or renamed commands)
</pattern>

<pattern name="file_paths">
Look for:
- Documented paths that don't exist in codebase
- Output paths that don't match build script outputs
- Config file locations that are incorrect
- Source file references that are outdated
</pattern>

<pattern name="api_documentation">
Look for:
- Functions/methods documented that don't exist in exports
- Parameter types that don't match actual implementation
- Return types incorrectly documented
- Missing required parameters in examples
- Examples using deprecated APIs
</pattern>

<pattern name="configuration">
Look for:
- Config examples using wrong keys or structure
- Documented options that aren't validated in code
- Missing required config fields
- Wrong default values documented
- Obsolete configuration formats
</pattern>

<pattern name="build_outputs">
Look for:
- Build output paths that don't match actual outputs
- Package names that are incorrect
- Missing build steps in documentation
</pattern>

<pattern name="version_information">
Look for:
- Outdated version numbers in examples
- Dependency versions that don't match package.json
- Tool version requirements that are incorrect
- Patch counts that don't match actual patches

**CRITICAL: For dependency versions:**
- DO NOT blindly "correct" documented versions without verification
- Check package.json files as the source of truth for dependency versions
- If unsure about a version, SKIP reporting it as incorrect - ask user to verify
- When in doubt, assume documentation is correct unless you can definitively verify otherwise
</pattern>

<pattern name="missing_documentation">
Look for:
- Public APIs/exports not documented in README
- Important environment variables not documented
- New features added but not documented
- Critical sections (75%+ of package) not mentioned
</pattern>

<pattern name="junior_dev_friendliness">
**CRITICAL: Evaluate documentation from a junior developer perspective**

Check for junior-developer unfriendly patterns:
- Missing "Why" explanations (e.g., "Use overrides to replace packages" without explaining what overrides are)
- Assumed knowledge not documented (npm overrides, pnpm workspaces)
- No examples for common workflows (first-time setup, typical usage)
- Missing troubleshooting sections
- No explanation of error messages
- Complex architecture diagrams without beginner-friendly overview
- Technical jargon without definitions/links
- Missing prerequisites or setup instructions
- No "Getting Started" or "Quick Start" section
- Undocumented debugging techniques

**Pay special attention to:**
1. **Root README.md** - First thing junior devs see, must be welcoming and clear
2. **Package READMEs** - Should explain purpose, use cases, and provide examples
3. **CLAUDE.md** - Project guidelines must be understandable by junior contributors
4. **Build/setup docs** - Critical for onboarding, must be step-by-step
5. **Error message handling** - Should help debug, not confuse

**Areas requiring extra scrutiny:**
- npm override concepts (how overrides work, why they exist)
- Package registry architecture (packages/npm/ structure, registry/lib/)
- Build scripts and automation (scripts/ directory)
- CI/CD workflows (reusable workflows, publishing)

For each junior-dev issue:
- Identify the knowledge gap or assumption
- Explain why this is confusing for juniors
- Suggest specific documentation additions (not just "add more docs")
- Provide example of clear explanation

Example findings:
- "README assumes knowledge of npm overrides without explaining them"
- "No explanation of what 'override packages' means or why they exist"
- "Technical term 'pnpm workspaces' used without definition"
- "Build errors not documented in troubleshooting section"
</pattern>

For each issue found:
1. Read the documented information
2. Read the actual code/config to verify
3. Determine the discrepancy
4. Provide the correct information
5. Evaluate junior developer friendliness
</instructions>

<output_format>
For each finding, report:

File: path/to/README.md:lineNumber
Issue: [One-line description of the documentation error]
Severity: High/Medium/Low
Pattern: [The incorrect documentation text]
Actual: [What the correct information should be]
Fix: [Exact documentation correction needed]
Impact: [Why this matters - confusion, errors, etc.]

Severity Guidelines:
- High: Critical inaccuracies that would cause errors if followed (wrong commands, non-existent APIs)
- Medium: Outdated information that misleads but doesn't immediately break (wrong paths, old examples)
- Low: Minor inaccuracies or missing non-critical information

Example:
File: packages/npm/lodash/README.md:46
Issue: Incorrect override version documented
Severity: High
Pattern: "Overrides lodash 4.17.20"
Actual: Override targets 4.17.21 (verified in package.json)
Fix: Change to: "Overrides lodash 4.17.21"
Impact: Misleads developers about which version is overridden

Example:
File: README.md:25
Issue: Incorrect command for creating override
Severity: High
Pattern: "pnpm run make-override lodash"
Actual: Script is "make-npm-override" not "make-override"
Fix: Change to: "pnpm run make-npm-override lodash"
Impact: Command will fail with script not found error

Example:
File: README.md:14
Issue: References non-existent registry/lib export
Severity: Medium
Pattern: "import { getPackage } from '@socketsecurity/registry/lib/packages'"
Actual: Export is named "readPackageJson" not "getPackage"
Fix: Change to: "import { readPackageJson } from '@socketsecurity/registry/lib/packages'"
Impact: Import will fail with module not found error

Example:
File: README.md:87
Issue: Incorrect npm override count
Severity: Low
Pattern: "Provides 50+ npm overrides"
Actual: Only 30 override packages in packages/npm/ (verified by ls)
Fix: Change to: "Provides 30+ npm overrides"
Impact: Minor inaccuracy in package count

**Junior Developer Friendliness Examples:**

Example:
File: README.md:1-50
Issue: Missing beginner-friendly introduction explaining project purpose
Severity: High
Pattern: Jumps directly to technical details without explaining what socket-registry is
Actual: Junior devs need context: "What is socket-registry?", "What are overrides?", "When would I use this?"
Fix: Add "What is Socket Registry?" section explaining: (1) Enhanced npm packages with security fixes, (2) Drop-in replacements for vulnerable packages, (3) Use cases (projects needing secure dependencies)
Impact: Junior devs confused about project purpose

Example:
File: README.md:15
Issue: Assumes knowledge of npm overrides without explanation
Severity: Medium
Pattern: "Uses pnpm overrides to replace packages"
Actual: Junior devs don't know what overrides are or how they work
Fix: Add: "npm overrides - replaces dependencies with enhanced versions automatically. Socket Registry provides secure, enhanced packages that work as drop-in replacements."
Impact: Technical jargon barrier prevents junior devs from understanding

Example:
File: README.md:80
Issue: No troubleshooting section for override conflicts
Severity: Medium
Pattern: Documentation shows happy path but no conflict resolution guidance
Actual: Junior devs hit errors like "Version conflict" or "Peer dependency mismatch" with no guidance
Fix: Add "Troubleshooting" section covering: (1) Version conflicts → check semver ranges, (2) Peer dependencies → verify compatibility, (3) Install failures → clear cache
Impact: Junior devs stuck when override errors occur

Example:
File: CLAUDE.md:125
Issue: Complex registry architecture without visual diagram
Severity: Medium
Pattern: Dense text explaining registry/lib and packages/npm structure
Actual: Junior devs need visual representation of registry workflow
Fix: Add ASCII diagram showing: npm install → registry check → override lookup → enhanced package, plus example: "When you install lodash, registry redirects to packages/npm/lodash"
Impact: Junior contributors may not understand override flow

Example:
File: README.md:1-100
Issue: Missing "Getting Started" section with minimal working example
Severity: High
Pattern: Extensive documentation but no simple setup example
Actual: Junior devs need: "How do I use an override? Step 1, Step 2, Step 3"
Fix: Add "Quick Start" section: "(1) Install: npm install @socketsecurity/registry, (2) Add to package.json: pnpm.overrides section, (3) Install dependencies: pnpm install"
Impact: Without concrete starting point, juniors struggle to use overrides
</output_format>

<quality_guidelines>
- Verify every claim against actual code - don't assume documentation is correct
- Read package.json files to check names, scripts, versions
- Run --help commands to verify CLI flags when possible
- Check exports in source files to verify APIs
- Look at build script outputs to verify paths
- Focus on high-impact errors first (wrong commands, non-existent APIs)
- Report missing documentation for major features (not every minor detail)
- Group related issues (e.g., "5 packages using @scope incorrectly")
- Provide exact fixes, not vague suggestions
- If a README is mostly missing (75%+ of package undocumented), report as single high-severity issue
</quality_guidelines>

Scan all README.md files in the repository and report all documentation inaccuracies found. If documentation is accurate, state that explicitly.
```

### Example Documentation Scan Output

```markdown
## Documentation Issues - 8 found

### High Severity - 3 issues

#### README.md:25
- **Issue**: Incorrect script name for creating overrides
- **Pattern**: `pnpm run make-override lodash`
- **Actual**: Script is "make-npm-override" not "make-override"
- **Fix**: Change to: `pnpm run make-npm-override lodash`
- **Impact**: Command fails with script not found error

#### packages/npm/lodash/README.md:100
- **Issue**: Documents incorrect override version
- **Pattern**: `Overrides lodash 4.17.20`
- **Actual**: Package targets 4.17.21 (verified in package.json)
- **Fix**: Update to: `Overrides lodash 4.17.21`
- **Impact**: Users confused about which version is overridden

#### README.md:12
- **Issue**: Documents non-existent registry/lib export
- **Pattern**: `import { getPackage } from '@socketsecurity/registry/lib/packages'`
- **Actual**: Export is named "readPackageJson" not "getPackage"
- **Fix**: Change to: `import { readPackageJson } from '@socketsecurity/registry/lib/packages'`
- **Impact**: Import fails with module not found error

### Medium Severity - 3 issues

#### README.md:62
- **Issue**: Incorrect override installation command
- **Pattern**: "Add to dependencies section"
- **Actual**: Overrides go in pnpm.overrides section, not dependencies
- **Fix**: Change to: "Add to pnpm.overrides section in package.json"
- **Impact**: Confusing installation process for developers

#### README.md:182
- **Issue**: Incorrect override count
- **Pattern**: "Provides 50+ npm overrides"
- **Actual**: Only 30 packages in packages/npm/ directory
- **Fix**: Change to: "Provides 30+ npm overrides"
- **Impact**: Minor discrepancy in package count

#### README.md:1-21
- **Issue**: Missing 75% of override packages in documentation
- **Pattern**: Only documents lodash and react, omits 28 other overrides
- **Actual**: Registry has overrides for webpack, typescript, babel, and many others
- **Fix**: Add comprehensive list of all override packages with descriptions
- **Impact**: Developers unaware of most available overrides

### Low Severity - 2 issues

#### README.md:227
- **Issue**: Incorrect registry URL
- **Pattern**: "https://registry.socket.dev/"
- **Actual**: Registry is at https://socket.dev/npm (verified in source)
- **Fix**: Change to: "https://socket.dev/npm"
- **Impact**: Minor URL inaccuracy

#### README.md:18
- **Issue**: Claims automatic override activation
- **Pattern**: "Overrides automatically apply after install"
- **Actual**: Requires pnpm.overrides configuration; not automatic
- **Fix**: Clarify that overrides require pnpm.overrides configuration
- **Impact**: Confusion about override activation process
```

