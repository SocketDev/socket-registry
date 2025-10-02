# CI/CD Architecture

Visual guide to the CI/CD pipeline architecture and workflow relationships.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CI PIPELINE (ci.yml)                     │
│                                                                   │
│  Orchestrates all quality checks in parallel                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────────────────────┐
                              │                                 │
                    ┌─────────▼──────────┐          ┌─────────▼──────────┐
                    │   Lint Check       │          │   Type Check       │
                    │   (lint.yml)       │          │   (types.yml)      │
                    │                    │          │                    │
                    │  • ESLint          │          │  • tsgo --noEmit   │
                    │  • Oxlint          │          │  • Build first     │
                    │  • Biome           │          │  • Node 22         │
                    │  • Node 22         │          │  • ~5 min          │
                    │  • ~5 min          │          │                    │
                    └────────────────────┘          └────────────────────┘
                              │
                    ┌─────────▼──────────────────────────────────────────┐
                    │              Test Matrix (test.yml)                │
                    │                                                     │
                    │  Cross-platform and cross-version testing          │
                    └─────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┬───────────────┐
              │               │               │               │
    ┌─────────▼────────┐ ┌───▼──────────┐ ┌─▼────────────┐ ┌▼──────────────┐
    │  Ubuntu + Node20 │ │Ubuntu + Node22│ │Ubuntu + Node24│ │Windows + ...  │
    │                  │ │               │ │               │ │               │
    │  pnpm build      │ │ pnpm build    │ │ pnpm build    │ │ pnpm build    │
    │  pnpm test-ci    │ │ pnpm test-ci  │ │ pnpm test-ci  │ │ pnpm test-ci  │
    │  ~15 min         │ │ ~15 min       │ │ ~15 min       │ │ ~15 min       │
    └──────────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Coverage Report   │
                    │                    │
                    │  • Full coverage   │
                    │  • 100% required   │
                    │  • Upload artifacts│
                    │  • Node 22         │
                    │  • ~15 min         │
                    └────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   CI Summary       │
                    │                    │
                    │  ✅ All Passed     │
                    │  ❌ Some Failed    │
                    └────────────────────┘
```

## Individual Workflow Architecture

### Test Workflow (test.yml)

```
┌────────────────────────────────────────────────────────┐
│                    Test Workflow                        │
└────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        │  Uses: socket-registry/test.yml │
        │                                 │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │   setup-and-install action      │
        │                                 │
        │  • Checkout code                │
        │  • Setup Node.js                │
        │  • Install pnpm                 │
        │  • Cache dependencies           │
        │  • pnpm install                 │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │    run-script action            │
        │                                 │
        │  • Run setup-script             │
        │    (pnpm run build)             │
        │  • Run main-script              │
        │    (pnpm run test-ci)           │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │    artifacts action             │
        │                                 │
        │  • Upload test results          │
        │  • Upload coverage              │
        │  • 7-day retention              │
        └─────────────────────────────────┘
```

### Lint Workflow (lint.yml)

```
┌────────────────────────────────────────────────────────┐
│                   Lint Workflow                         │
└────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        │  Uses: socket-registry/lint.yml │
        │                                 │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │   setup-and-install action      │
        │                                 │
        │  • Node.js 22                   │
        │  • pnpm install                 │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │    run-script action            │
        │                                 │
        │  • pnpm run check-ci            │
        │    - ESLint                     │
        │    - Oxlint                     │
        │    - Biome                      │
        └─────────────────────────────────┘
```

### Type Check Workflow (types.yml)

```
┌────────────────────────────────────────────────────────┐
│                 Type Check Workflow                     │
└────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        │  Uses: socket-registry/types.yml│
        │                                 │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │   setup-and-install action      │
        │                                 │
        │  • Node.js 22                   │
        │  • pnpm install                 │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │    run-script action            │
        │                                 │
        │  • Setup: pnpm run build        │
        │  • Main: pnpm run check:tsc     │
        │    - tsgo --noEmit              │
        └─────────────────────────────────┘
```

## Workflow Triggers

```
┌─────────────────────────────────────────────────────────────────┐
│                         Event Triggers                           │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼─────┐         ┌───▼────┐         ┌─────▼─────┐
    │   Push   │         │   PR   │         │  Manual   │
    │  to main │         │ to main│         │ Dispatch  │
    └────┬─────┘         └───┬────┘         └─────┬─────┘
         │                   │                     │
         └───────────────────┼─────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐        ┌───▼────┐         ┌───▼─────┐
    │ ci.yml   │        │test.yml│         │lint.yml │
    │types.yml │        └────────┘         └─────────┘
    └──────────┘
```

## Concurrency Control

```
┌─────────────────────────────────────────────────────────────────┐
│                      Concurrency Groups                          │
│                                                                   │
│  group: workflow-name-PR_HEAD_REF                               │
│  cancel-in-progress: true                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼─────────┐    ┌────▼─────────┐    ┌────▼─────────┐
    │  Commit A    │    │  Commit B    │    │  Commit C    │
    │  (Cancelled) │    │  (Cancelled) │    │  (Running)   │
    └──────────────┘    └──────────────┘    └──────────────┘
                                                    │
                                            ┌───────▼────────┐
                                            │  Latest commit │
                                            │  continues     │
                                            └────────────────┘
```

## Dependency Graph

```
┌──────────────────────────────────────────────────────────────┐
│                    Workflow Dependencies                      │
└──────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼────────────┐  ┌───▼────────────┐  ┌───▼────────────┐
    │ Reusable        │  │ Reusable       │  │ Composite      │
    │ Workflows       │  │ Workflows      │  │ Actions        │
    │                 │  │                │  │                │
    │ • test.yml      │  │ • lint.yml     │  │ • setup-install│
    │ • types.yml     │  │ • types.yml    │  │ • run-script   │
    │                 │  │                │  │ • artifacts    │
    └─────────────────┘  └────────────────┘  └────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                  ┌───────────▼──────────┐
                  │  socket-registry     │
                  │  @main               │
                  │                      │
                  │  Single source of    │
                  │  truth for all       │
                  │  Socket projects     │
                  └──────────────────────┘
```

## Test Matrix Expansion

```
┌──────────────────────────────────────────────────────────────┐
│               Matrix Strategy Configuration                   │
│                                                               │
│  node-versions: [20, 22, 24]                                 │
│  os-versions: ["ubuntu-latest", "windows-latest"]            │
└──────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         │                                         │
         │           Matrix Expansion              │
         │                                         │
         └────────────┬────────────────────────────┘
                      │
      ┌───────────────┼───────────────┐
      │               │               │
┌─────▼──────┐  ┌────▼──────┐  ┌─────▼──────┐
│ ubuntu-20  │  │ ubuntu-22 │  │ ubuntu-24  │
└────────────┘  └───────────┘  └────────────┘
┌─────▼──────┐  ┌────▼──────┐  ┌─────▼──────┐
│ windows-20 │  │ windows-22│  │ windows-24 │
└────────────┘  └───────────┘  └────────────┘
       │               │               │
       └───────────────┼───────────────┘
                       │
            6 parallel test jobs
         (limited to max-parallel: 4)
```

## Artifact Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Artifact Management                       │
└──────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         │                                         │
    ┌────▼────────┐                        ┌──────▼──────────┐
    │   Tests     │                        │   Coverage      │
    │             │                        │                 │
    │ • Results   │                        │ • HTML report   │
    │ • Logs      │                        │ • JSON data     │
    │ • Per-OS    │                        │ • Percentage    │
    │ • Per-Node  │                        │ • 7-day keep    │
    └─────────────┘                        └─────────────────┘
         │                                         │
         └────────────────────┬────────────────────┘
                              │
                  ┌───────────▼──────────┐
                  │  GitHub Artifacts    │
                  │                      │
                  │  • Downloadable      │
                  │  • 7-day retention   │
                  │  • Per-run           │
                  └──────────────────────┘
```

## Performance Characteristics

| Workflow | Typical Duration | Max Jobs | Bottleneck |
|----------|-----------------|----------|------------|
| ci.yml (complete) | ~15 min | 8 | Test matrix |
| test.yml | ~15 min | 6 (4 parallel) | Build + tests |
| lint.yml | ~5 min | 1 | ESLint |
| types.yml | ~5 min | 1 | Build |
| coverage | ~15 min | 1 | Coverage collection |

## Cost Optimization

### Concurrency Limits
- Maximum 4 parallel jobs reduces queue time while managing costs
- Cancel-in-progress eliminates wasted runs

### Caching Strategy
- Dependencies cached per Node version
- Build outputs cached when possible
- Cache hits reduce run time by ~2 minutes

### Runner Selection
- Ubuntu for most jobs (fastest, cheapest)
- Windows only where needed (compatibility)
- macOS excluded (unnecessary, expensive)

## References

- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Reusable Workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
- [Matrix Strategy](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)
- [socket-registry workflows](https://github.com/SocketDev/socket-registry/tree/main/.github/workflows)
