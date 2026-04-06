---
name: quality-scan
description: Validates structural consistency, cleans up junk files (SCREAMING_TEXT.md, temp files), and performs comprehensive quality scans across codebase to identify critical bugs, logic errors, caching issues, and workflow problems. Spawns specialized agents for targeted analysis and generates prioritized improvement tasks. Use when improving code quality, before releases, or investigating issues.
---

# quality-scan

<task>
Your task is to perform comprehensive quality scans across the codebase using specialized agents to identify critical bugs, logic errors, caching issues, and workflow problems. Before scanning, clean up junk files (SCREAMING_TEXT.md files, temporary test files, etc.) to ensure a clean and organized repository. Generate a prioritized report with actionable improvement tasks.
</task>

<context>
**What is Quality Scanning?**
Quality scanning uses specialized AI agents to systematically analyze code for different categories of issues. Each agent type focuses on specific problem domains and reports findings with severity levels and actionable fixes.

**Scan Types Available:**
1. **critical** - Crashes, security vulnerabilities, resource leaks, data corruption
2. **logic** - Algorithm errors, edge cases, type guards, off-by-one errors
3. **cache** - Cache staleness, race conditions, invalidation bugs
4. **workflow** - Build scripts, CI issues, cross-platform compatibility
5. **workflow-optimization** - CI optimization checks (build-required conditions on cached builds)
6. **security** - GitHub Actions workflow security (zizmor scanner)
7. **documentation** - README accuracy, outdated docs, missing documentation, junior developer friendliness

**Why Quality Scanning Matters:**
- Catches bugs before they reach production
- Identifies security vulnerabilities early
- Improves code quality systematically
- Provides actionable fixes with file:line references
- Prioritizes issues by severity for efficient remediation
- Cleans up junk files for a well-organized repository

**Agent Prompts:**
All agent prompts are embedded in `reference.md` with structured <context>, <instructions>, <pattern>, and <output_format> tags following Claude best practices.
</context>

<constraints>
**CRITICAL Requirements:**
- Analysis phase (dependency updates and cleanup happen in early phases, code scanning is read-only)
- Must complete all enabled scans before reporting
- Findings must be prioritized by severity (Critical → High → Medium → Low)
- Must generate actionable tasks with file:line references
- All findings must include suggested fixes

**Do NOT:**
- Fix issues during scan (analysis only - report findings)
- Skip critical scan types without user permission
- Report findings without file/line references
- Proceed if codebase has uncommitted changes (warn but continue)

**Do ONLY:**
- Run enabled scan types in priority order (critical → logic → cache → workflow)
- Generate structured findings with severity levels
- Provide actionable improvement tasks with specific code changes
- Report statistics and coverage metrics
- Deduplicate findings across scans
</constraints>

<instructions>

## Process

Execute the following phases sequentially to perform comprehensive quality analysis.

### Phase 1: Validate Environment

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

Follow `_shared/env-check.md` to validate the environment and initialize a queue run entry for `quality-scan`.

---

### Phase 2: Update Dependencies

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

<action>
Update dependencies in the current repository only:
</action>

**Update Process:**

```bash
pnpm run update
```

<validation>
**Expected Results:**
- Dependencies updated in current repository
- Report number of packages updated
- Continue with scan even if update fails

**Track for reporting:**
- Packages updated: N
- Update status: Success/Failed (with warning)

**Important:** Only update dependencies in the current repository. Do NOT attempt to update sibling repositories as this is out of scope and could have unintended side effects.</validation>

---

### Phase 2b: Install External Tools (zizmor)

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

See `_shared/security-tools.md` for zizmor detection. Use `pnpm run setup` to install pinned tools.

---

### Phase 3: Repository Cleanup

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

<action>
Clean up junk files and organize the repository before scanning:
</action>

**Cleanup Tasks:**

1. **Remove SCREAMING_TEXT.md files** (all-caps .md files) that are NOT:
   - Inside `.claude/` directory
   - Inside `docs/` directory
   - Named `README.md`, `LICENSE`, or `SECURITY.md`

2. **Remove temporary test files** in wrong locations:
   - `.test.mjs` or `.test.mts` files outside `test/` or `__tests__/` directories
   - Temp files: `*.tmp`, `*.temp`, `.DS_Store`, `Thumbs.db`
   - Editor backups: `*~`, `*.swp`, `*.swo`, `*.bak`
   - Test artifacts: `*.log` files in root or package directories (not logs/)

```bash
# Find SCREAMING_TEXT.md files (all caps with .md extension)
find . -type f -name '*.md' \
  ! -path './.claude/*' \
  ! -path './docs/*' \
  ! -name 'README.md' \
  ! -name 'LICENSE' \
  ! -name 'SECURITY.md' \
  | grep -E '/[A-Z_]+\.md$'

# Find test files in wrong locations
find . -type f \( -name '*.test.mjs' -o -name '*.test.mts' \) \
  ! -path '*/test/*' \
  ! -path '*/__tests__/*' \
  ! -path '*/node_modules/*'

# Find temp files
find . -type f \( \
  -name '*.tmp' -o \
  -name '*.temp' -o \
  -name '.DS_Store' -o \
  -name 'Thumbs.db' -o \
  -name '*~' -o \
  -name '*.swp' -o \
  -name '*.swo' -o \
  -name '*.bak' \
\) ! -path '*/node_modules/*'

# Find log files in wrong places (not in logs/ or build/ directories)
find . -type f -name '*.log' \
  ! -path '*/logs/*' \
  ! -path '*/build/*' \
  ! -path '*/node_modules/*' \
  ! -path '*/.git/*'
```

<validation>
**For each file found:**
1. Show the file path to user
2. Explain why it's considered junk
3. In interactive mode: ask user for confirmation before deleting
4. In CI mode or when called as a pipeline gate: auto-delete without prompting
5. Delete confirmed files: `git rm` if tracked, `rm` if untracked
6. Report files removed

**If no junk files found:**
- Report: "✓ Repository is clean - no junk files found"
- Track deleted files for reporting

</validation>

---

### Phase 4: Structural Validation

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

<action>
Run automated consistency checker to validate architectural patterns:
</action>

**Validation Tasks:**

Run the check script to validate monorepo structure:

```bash
pnpm run check --all
```

**The consistency checker validates:**
1. **Required files** - README.md, package.json existence
2. **Vitest configurations** - Proper mergeConfig usage
3. **Test scripts** - Correct test patterns per package type
4. **Coverage scripts** - Coverage setup where appropriate
5. **External tools** - external-tools.json format validation
6. **Build output structure** - Standard build/{mode}/out/Final/ layout
7. **Package.json structure** - Standard fields and structure
8. **Workspace dependencies** - Proper workspace:* and catalog: usage

<validation>
**Expected Results:**
- Errors: 0 (any errors should be reported as Critical findings)
- Warnings: 2 or fewer (expected deviations documented in checker)
- Info: Multiple info messages are normal (observations only)

**If errors found:**
1. Report as Critical findings in the final report
2. Include file:line references from checker output
3. Suggest fixes based on checker recommendations
4. Continue with remaining scans

**If warnings found:**
- Report as Low findings (these are expected deviations)
- Document in final report under "Structural Validation"

**Track for reporting:**
- Number of packages validated
- Number of errors/warnings/info messages
- Any architectural pattern violations

</validation>

---

### Phase 5: Determine Scan Scope

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

<action>
Ask user which scans to run:
</action>

**Default Scan Types** (run all unless user specifies):
1. **critical** - Critical bugs (crashes, security, resource leaks)
2. **logic** - Logic errors (algorithms, edge cases, type guards)
3. **cache** - Caching issues (staleness, races, invalidation)
4. **workflow** - Workflow problems (scripts, CI, git hooks)
5. **workflow-optimization** - CI optimization (build-required checks for cached builds)
6. **security** - GitHub Actions security (template injection, cache poisoning, etc.)
7. **documentation** - Documentation accuracy (README errors, outdated docs)

**Scan Selection:**
- In CI mode or when called as a pipeline gate (e.g. by `/release`): run all scans automatically, no prompting
- In interactive mode: ask the user which scans to run:
  - "All scans (recommended)" — run all scan types
  - "Critical only" — run critical scan only
  - "Critical + Logic" — run critical and logic scans
  - "Custom selection" — ask user to specify

**Default:** If not specified, run all scans.

<validation>
Validate selected scan types exist in reference.md:
- critical-scan → reference.md § "Critical Scan Agent"
- logic-scan → reference.md § "Logic Scan Agent"
- cache-scan → reference.md § "Cache Scan Agent"
- workflow-scan → reference.md § "Workflow Scan Agent"
- security-scan → reference.md § "Security Scan Agent"
- workflow-optimization-scan → reference.md § "Workflow Optimization Scan Agent"
- documentation-scan → reference.md § "Documentation Scan Agent"

If user requests non-existent scan type, report error and suggest valid types.
</validation>

---

### Phase 6: Execute Scans

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

<action>
For each enabled scan type, spawn a specialized agent using Agent tool:
</action>

```
Example: Critical scan via Agent tool

Prompt the agent with the CRITICAL_SCAN_PROMPT from reference.md, adding:

[IF monorepo] Focus on packages/ directories and root-level scripts/.
[IF single package] Focus on src/, lib/, and scripts/ directories.

Report findings in this format:
- File: path/to/file.mts:lineNumber
- Issue: Brief description
- Severity: Critical/High/Medium/Low
- Pattern: Code snippet
- Trigger: What input triggers this
- Fix: Suggested fix
- Impact: What happens if triggered

Scan systematically and report all findings. If no issues found, state that explicitly.
```

**For each scan:**
1. Load agent prompt template from `reference.md`
2. Customize for repository context (determine monorepo vs single package structure)
3. Spawn agent with Agent tool using "general-purpose" subagent_type
4. Capture findings from agent response
5. Parse and categorize results

**Execution Order:** Run scans sequentially in priority order:
- critical (highest priority)
- logic
- cache
- workflow (lowest priority)

**Agent Rules:**
- For critical, logic, and cache scans: the agent should apply the rules from `agents/code-reviewer.md` (code style, patterns, error handling) in addition to the scan-type-specific prompt from reference.md.
- For the security scan type: the agent should apply the rules from `agents/security-reviewer.md` (safe file ops, secret detection, dependency rules).

**Agent Prompt Sources:**
- Critical scan: reference.md § "Critical Scan Agent"
- Logic scan: reference.md § "Logic Scan Agent"
- Cache scan: reference.md § "Cache Scan Agent"
- Workflow scan: reference.md § "Workflow Scan Agent"
- Security scan: reference.md § "Security Scan Agent"
- Workflow-optimization scan: reference.md § "Workflow Optimization Scan Agent"
- Documentation scan: reference.md § "Documentation Scan Agent"

<validation>
For each scan completion:
- Verify agent completed without errors
- Extract findings from agent output
- Parse into structured format (file, issue, severity, fix)
- Track scan coverage (files analyzed)
</validation>

---

### Phase 7: Aggregate Findings

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

<action>
Collect all findings from agents and aggregate:
</action>

```typescript
interface Finding {
  file: string           // "src/path/to/file.mts:89" or "packages/pkg/src/file.mts:89"
  issue: string          // "Potential null pointer access"
  severity: "Critical" | "High" | "Medium" | "Low"
  scanType: string       // "critical"
  pattern: string        // Code snippet showing the issue
  trigger: string        // What causes this issue
  fix: string            // Suggested code change
  impact: string         // What happens if triggered
}
```

**Deduplication:**
- Remove duplicate findings across scans (same file:line, same issue)
- Keep the finding from the highest priority scan
- Track which scans found the same issue

**Prioritization:**
- Sort by severity: Critical → High → Medium → Low
- Within same severity, sort by scanType priority
- Within same severity+scanType, sort alphabetically by file path

<validation>
**Checkpoint:** Verify aggregation:
- Total findings count
- Breakdown by severity (N critical, N high, N medium, N low)
- Breakdown by scan type
- Duplicate removal count (if any)
</validation>

---

### Phase 8: Generate Report

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

<action>
Create structured quality report with all findings:
</action>

```markdown
# Quality Scan Report

**Date:** YYYY-MM-DD
**Repository:** [repository name]
**Scans:** [list of scan types run]
**Files Scanned:** N
**Findings:** N critical, N high, N medium, N low

## Dependency Updates

**Status:** N packages updated
**Result:** Success/Failed

## Structural Validation

**Consistency Checker Results:**
- Packages validated: 12
- Errors: N (reported as Critical below)
- Warnings: N (reported as Low below)
- Info: N observations

**Validation Categories:**
✓ Required files
✓ Vitest configurations
✓ Test scripts
✓ Coverage scripts
✓ External tools
✓ Build output structure
✓ Package.json structure
✓ Workspace dependencies

## Critical Issues (Priority 1) - N found

### src/path/to/file.mts:89
- **Issue**: [Description of critical issue]
- **Pattern**: [Problematic code snippet]
- **Trigger**: [What triggers this issue]
- **Fix**: [Suggested fix]
- **Impact**: [Impact description]
- **Scan**: critical

## High Issues (Priority 2) - N found

[Similar format for high severity issues]

## Medium Issues (Priority 3) - N found

[Similar format for medium severity issues]

## Low Issues (Priority 4) - N found

[Similar format for low severity issues]

## Scan Coverage

- **Dependency updates**: N packages updated
- **Structural validation**: [IF consistency checker exists] N packages validated, N architectural patterns checked
- **Critical scan**: N files analyzed in [src/ or packages/]
- **Logic scan**: N files analyzed
- **Cache scan**: N files analyzed (if applicable)
- **Workflow scan**: N files analyzed (package.json, scripts/, .github/)

## Recommendations

1. Address N critical issues immediately before next release
2. Review N high-severity logic errors in patch application
3. Schedule N medium issues for next sprint
4. Low-priority items can be addressed during refactoring

## No Findings

[If a scan found no issues, list it here:]
- Critical scan: ✓ Clean
- Logic scan: ✓ Clean
```

**Output Report:**
1. Display report to console
2. In interactive mode: offer to save to file (`reports/quality-scan-YYYY-MM-DD.md`)
3. In CI mode or pipeline gate mode: skip save prompt

<validation>
**Report Quality Checks:**
- All findings include file:line references
- All findings include suggested fixes
- Findings are grouped by severity
- Scan coverage statistics included
- Recommendations are actionable
</validation>

---

### Phase 9: Complete

Update queue: advance `current_phase` in `.claude/ops/queue.yaml`

<completion_signal>
Output a HANDOFF block per `_shared/report-format.md`:

```
=== HANDOFF: quality-scan ===
Status: {pass|fail}
Grade: {A-F}
Findings: {critical: N, high: N, medium: N, low: N}
Summary: {one-line description}
=== END HANDOFF ===
```
</completion_signal>

<summary>
Report these final metrics to the user:

**Quality Scan Complete**
========================
✓ Dependency updates: N packages updated
✓ Structural validation: [IF applicable] N packages validated (N errors, N warnings)
✓ Repository cleanup: N junk files removed
✓ Scans completed: [list of scan types]
✓ Total findings: N (N critical, N high, N medium, N low)
✓ Files scanned: N
✓ Report generated: Yes
✓ Scan duration: [calculated from start to end]

**Dependency Update Summary:**
- Packages updated: N
- Update status: Success/Failed

**Structural Validation Summary:**
[IF consistency checker exists]
- Packages validated: N
- Consistency errors: N (included in critical findings)
- Consistency warnings: N (included in low findings)
- Architectural patterns checked: N

**Repository Cleanup Summary:**
- SCREAMING_TEXT.md files removed: N
- Temporary test files removed: N
- Temp/backup files removed: N
- Log files cleaned up: N

**Critical Issues Requiring Immediate Attention:**
- N critical issues found
- Review report above for details and fixes

**Next Steps:**
1. Address critical issues immediately
2. Review high-severity findings
3. Schedule medium/low issues appropriately
4. Re-run scans after fixes to verify

All findings include file:line references and suggested fixes.
</summary>

</instructions>

## Success Criteria

- ✅ HANDOFF block output per `_shared/report-format.md`
- ✅ All enabled scans completed without errors
- ✅ Findings prioritized by severity (Critical → Low)
- ✅ All findings include file:line references
- ✅ Actionable suggestions provided for all findings
- ✅ Report generated with statistics and coverage metrics
- ✅ Duplicate findings removed

## Scan Types

See `reference.md` for detailed agent prompts with structured tags:

- **critical-scan** - Null access, promise rejections, race conditions, resource leaks
- **logic-scan** - Off-by-one errors, type guards, edge cases, algorithm correctness
- **cache-scan** - Invalidation, key generation, memory management, concurrency
- **workflow-scan** - Scripts, package.json, git hooks, CI configuration
- **workflow-optimization-scan** - CI optimization checks (build-required on installation steps with checkpoint caching)
- **security-scan** - GitHub Actions workflow security (runs zizmor scanner)
- **documentation-scan** - README accuracy, outdated examples, incorrect package names, missing documentation, junior developer friendliness (beginner-friendly explanations, troubleshooting, getting started guides)

All agent prompts follow Claude best practices with <context>, <instructions>, <pattern>, <output_format>, and <quality_guidelines> tags.

## Commands

Requires: `git`, `pnpm`, `node`, and optionally `zizmor` (see `_shared/security-tools.md`).

## Context

This skill provides systematic code quality analysis by:
- Spawning specialized agents for targeted analysis
- Using Agent tool to run agents autonomously
- Embedding agent prompts in reference.md following best practices
- Generating prioritized, actionable reports
- Supporting partial scans (user can select specific scan types)

For detailed agent prompts with best practices structure, see `reference.md`.
