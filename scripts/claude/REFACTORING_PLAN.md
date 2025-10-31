# Claude.mjs Refactoring Plan

## Current State

- **Size**: 5,723 lines
- **Functions/Classes**: 62 top-level declarations
- **Purpose**: CLI tool for managing Claude Code operations across Socket projects
- **Issues**: Monolithic structure, difficult to test/maintain, high cognitive load

## Proposed Module Structure

```
scripts/claude/
├── index.mjs                    # Main entry point (CLI routing)
├── config.mjs                   # Constants, paths, pricing
├── storage.mjs                  # Storage initialization & cleanup
├── cost-tracker.mjs             # CostTracker class
├── progress-tracker.mjs         # ProgressTracker class
├── snapshot-manager.mjs         # SnapshotManager class
├── error-analysis.mjs           # Error analysis & root cause detection
├── command-execution.mjs        # runCommand, runCommandWithOutput, runClaude
├── authentication.mjs           # Claude & GitHub auth handling
├── model-strategy.mjs           # ModelStrategy class & smart context
├── parallel-execution.mjs       # Parallel task execution utilities
├── project-sync.mjs             # CLAUDE.md sync across projects
├── automated-fixing.mjs         # Autonomous & interactive fix sessions
├── commands/
│   ├── commit.mjs               # runClaudeCommit
│   ├── review.mjs               # runCodeReview
│   ├── analyze-deps.mjs         # runDependencyAnalysis
│   ├── generate-tests.mjs       # runTestGeneration
│   ├── document.mjs             # runDocumentation
│   ├── refactor.mjs             # runRefactor
│   ├── optimize.mjs             # runOptimization
│   ├── audit.mjs                # runAudit
│   └── security-scan.mjs        # runSecurityScan
└── utils/
    ├── formatting.mjs           # printHeader, printFooter, formatDuration
    ├── git-helpers.mjs          # Git-specific utilities
    └── prompt-builders.mjs      # buildEnhancedPrompt, createSyncPrompt
```

## Module Dependencies

```
index.mjs
  ├─> config.mjs (constants)
  ├─> storage.mjs (init)
  ├─> authentication.mjs (check/ensure auth)
  └─> commands/* (route to command modules)

commands/*
  ├─> command-execution.mjs (runClaude)
  ├─> cost-tracker.mjs (tracking)
  ├─> progress-tracker.mjs (UI)
  └─> model-strategy.mjs (AI decisions)

command-execution.mjs
  ├─> authentication.mjs
  ├─> snapshot-manager.mjs
  └─> error-analysis.mjs

error-analysis.mjs
  ├─> storage.mjs (history)
  └─> utils/formatting.mjs

project-sync.mjs
  ├─> command-execution.mjs
  ├─> utils/git-helpers.mjs
  └─> utils/prompt-builders.mjs
```

## Migration Strategy

### Phase 1: Extract Pure Utilities (Low Risk)
**Effort**: 2-3 hours

1. **config.mjs**: Extract constants, paths, pricing (lines 1-111)
   - No dependencies
   - Pure data
   - Easy to test

2. **utils/formatting.mjs**: Extract formatting functions (lines 112-127, 271-287)
   - printHeader, printFooter, formatDuration
   - No dependencies
   - Simple unit tests

### Phase 2: Extract Standalone Classes (Medium Risk)
**Effort**: 3-4 hours

3. **cost-tracker.mjs**: Extract CostTracker class (lines 183-270)
   - Depends on config.mjs (pricing)
   - Depends on utils/formatting.mjs
   - Unit tests for cost calculations

4. **progress-tracker.mjs**: Extract ProgressTracker class (lines 288-431)
   - Depends on cost-tracker.mjs
   - Depends on utils/formatting.mjs
   - Unit tests for progress display

5. **snapshot-manager.mjs**: Extract SnapshotManager class (lines 432-500)
   - Minimal dependencies
   - Unit tests for snapshot operations

6. **model-strategy.mjs**: Extract ModelStrategy class (lines 1408-1523)
   - Depends on config.mjs (pricing, models)
   - Complex but self-contained logic
   - Unit tests for strategy selection

### Phase 3: Extract Infrastructure (Medium-High Risk)
**Effort**: 4-5 hours

7. **storage.mjs**: Extract storage functions (lines 128-182)
   - initStorage, cleanupOldData
   - Depends on config.mjs
   - Integration tests for file operations

8. **authentication.mjs**: Extract auth functions (lines 1145-1375)
   - checkClaude, ensureClaudeAuthenticated, ensureGitHubAuthenticated
   - Depends on command-execution.mjs (circular dependency risk)
   - Mock external auth calls in tests

9. **command-execution.mjs**: Extract execution functions (lines 890-972)
   - runCommand, runCommandWithOutput, runClaude
   - Depends on: authentication, snapshot-manager, error-analysis
   - Mock process spawning in tests

10. **parallel-execution.mjs**: Extract parallel utilities (lines 1880-2005)
    - executeParallel, shouldRunParallel, runParallel
    - Depends on command-execution.mjs
    - Unit tests with mock tasks

### Phase 4: Extract Feature Modules (High Risk)
**Effort**: 6-8 hours

11. **error-analysis.mjs**: Extract error handling (lines 501-890)
    - analyzeRootCause, loadErrorHistory, saveErrorHistory
    - Depends on storage.mjs, command-execution.mjs
    - Complex logic requires comprehensive tests

12. **project-sync.mjs**: Extract sync logic (lines 2005-2391)
    - findSocketProjects, syncClaudeMd, updateProjectClaudeMd
    - Depends on command-execution.mjs, utils/*
    - Integration tests with mock projects

13. **automated-fixing.mjs**: Extract fix sessions (lines 2391-2786)
    - scanProjectForIssues, autonomousFixSession, interactiveFixSession
    - Depends on: command-execution, error-analysis, progress-tracker
    - Complex user interaction flow

### Phase 5: Extract Commands (Medium Risk)
**Effort**: 5-6 hours

14. **commands/*.mjs**: Extract individual commands (lines 2786-end)
    - Each command is relatively self-contained
    - All depend on command-execution.mjs
    - Similar structure makes batch refactoring easier

### Phase 6: Create Entry Point (Low-Medium Risk)
**Effort**: 2-3 hours

15. **index.mjs**: New main entry point
    - CLI argument parsing
    - Route to appropriate command modules
    - Minimal logic, mostly imports and routing

## Circular Dependency Resolution

**Problem**: authentication.mjs needs runCommand, but command-execution.mjs needs authentication.

**Solutions**:
1. **Dependency Injection**: Pass auth checker as callback to runClaude
2. **Lazy Import**: Dynamic import() in runClaude when needed
3. **Separate Layer**: Create auth-checker.mjs with no execution dependencies

**Recommendation**: Option 3 (separate layer) for cleaner architecture.

## Testing Strategy

### Unit Tests
- Pure utilities (formatters, cost calculations)
- Standalone classes with mocked dependencies
- Model strategy logic

### Integration Tests
- Storage operations (with temp directories)
- Command execution (with mock processes)
- Project sync (with test fixtures)

### End-to-End Tests
- Full command flows (commit, review, etc.)
- Use test fixtures and mock Claude API
- Verify file system side effects

## Rollout Strategy

1. **Feature Flag**: Add `--use-modular` flag during transition
2. **Parallel Existence**: Keep claude.mjs until modules proven stable
3. **Gradual Migration**: Move one command at a time
4. **Comprehensive Testing**: Test each module before next migration
5. **Documentation**: Update CLAUDE.md with new structure

## Success Metrics

- **Maintainability**: No file > 500 lines
- **Testability**: > 80% code coverage
- **Cognitive Load**: < 10 functions per module
- **Build Time**: No regression in execution speed
- **Reliability**: Zero regressions in existing functionality

## Estimated Total Effort

- **Phase 1-2**: 5-7 hours (low risk, high value)
- **Phase 3-4**: 10-13 hours (medium-high risk)
- **Phase 5-6**: 7-9 hours (medium risk)
- **Testing**: 8-10 hours (comprehensive coverage)
- **Documentation**: 2-3 hours (updating guides)

**Total**: 32-42 hours (4-5 full development days)

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Circular dependencies | High | Separate auth-checker layer |
| Breaking changes | High | Feature flag + parallel existence |
| Lost functionality | High | Comprehensive E2E tests |
| Performance regression | Medium | Benchmark before/after |
| Adoption resistance | Low | Clear documentation + benefits |

## Quick Wins (Immediate Actions)

Before full refactoring, extract these for immediate benefit:

1. **Extract config.mjs** (30 min)
   - Zero risk, immediate clarity
   - Makes constants reusable

2. **Extract cost-tracker.mjs** (1 hour)
   - Self-contained class
   - Enables testing cost logic

3. **Extract utils/formatting.mjs** (30 min)
   - Simple functions
   - Reduces main file size

**Total Quick Wins**: ~2 hours, ~400 lines extracted

## Future Considerations

- **TypeScript Migration**: Consider adding types during refactoring
- **Shared Utilities**: Extract to @socketsecurity/lib where appropriate
- **CLI Framework**: Consider using a proper CLI framework (yargs, commander)
- **Configuration File**: Move constants to .clauderc.json for user customization

## Conclusion

This refactoring will significantly improve maintainability and testability of the claude.mjs tool. The phased approach minimizes risk while delivering incremental value. Start with Phase 1 quick wins for immediate benefit.
