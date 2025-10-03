# GitHub Actions Workflows

Quick reference for all CI/CD workflows in this repository.

## Workflows Overview

| Workflow | Purpose | Triggers | Duration |
|----------|---------|----------|----------|
| `ci.yml` | Complete CI pipeline | Push, PR, Manual | ~15 min |
| `test.yml` | Cross-platform tests | Push, PR, Manual | ~15 min |
| `lint.yml` | Code quality checks | Push, PR, Manual | ~5 min |
| `types.yml` | TypeScript validation | Push, PR, Manual | ~5 min |
| `provenance.yml` | Package publishing | Tag push | ~10 min |
| `claude.yml` | AI code review | Push to branches | ~2 min |
| `claude-auto-review.yml` | Auto PR review | Pull Request | ~3 min |
| `socket-auto-pr.yml` | Dependency PRs | Schedule | Varies |

## Quick Commands

### Local Development

```bash
# Run everything (same as CI)
pnpm test

# Individual checks
pnpm run check:lint          # Lint check
pnpm run check:tsc           # Type check
pnpm run test:unit           # Unit tests
pnpm run coverage            # Full coverage report

# Auto-fix
pnpm run fix                 # Fix all auto-fixable issues
```

### CI Scripts

```bash
pnpm run check-ci           # CI lint check
pnpm run test-ci            # CI test suite
```

## Workflow Dependencies

All workflows use reusable workflows and actions from `SocketDev/socket-registry`:

### Reusable Workflows
- `SocketDev/socket-registry/.github/workflows/test.yml@cb058af30991fa29b82f0c89f7d37397e067d292` # main
- `SocketDev/socket-registry/.github/workflows/lint.yml@cb058af30991fa29b82f0c89f7d37397e067d292` # main
- `SocketDev/socket-registry/.github/workflows/types.yml@cb058af30991fa29b82f0c89f7d37397e067d292` # main

### Reusable Actions
- `SocketDev/socket-registry/.github/actions/setup-and-install@cb058af30991fa29b82f0c89f7d37397e067d292` # main - Setup Node.js and install dependencies
- `SocketDev/socket-registry/.github/actions/run-script@cb058af30991fa29b82f0c89f7d37397e067d292` # main - Execute scripts with error handling
- `SocketDev/socket-registry/.github/actions/artifacts@cb058af30991fa29b82f0c89f7d37397e067d292` # main - Upload test results and coverage
- `SocketDev/socket-registry/.github/actions/debug@cb058af30991fa29b82f0c89f7d37397e067d292` # main - Debug workflow troubleshooting
- `SocketDev/socket-registry/.github/actions/cache-npm-packages@cb058af30991fa29b82f0c89f7d37397e067d292` # main - Cache npm package operations

## Configuration Files

| File | Purpose |
|------|---------|
| `.github/workflows/*.yml` | GitHub Actions workflows |
| `eslint.config.mjs` | ESLint configuration |
| `.oxlintrc.json` | Oxlint configuration |
| `biome.json` | Biome formatter/linter |
| `tsconfig.json` | TypeScript configuration |
| `vitest.config.js` | Test configuration |

## Testing Matrix

### Node Versions
- **Node 20**: Active LTS
- **Node 22**: Active LTS
- **Node 24**: Current

### Platforms
- **Ubuntu Latest**: Primary platform
- **Windows Latest**: Windows compatibility

## Coverage Requirements

Current coverage: **100%**
- Statements: 100%
- Branches: 100%
- Functions: 100%
- Lines: 100%
- Types: 100%

## Troubleshooting

### Common Issues

**Tests pass locally but fail in CI**
- Check Node.js version: `node --version`
- Verify environment: CI uses `.env.test`
- Check platform: Test on Windows if using Windows CI

**Type check fails**
- Run build first: `pnpm run build`
- Check tsgo version: `pnpm list @typescript/native-preview`

**Lint failures**
- Auto-fix: `pnpm run fix`
- Check all linters: `pnpm run check:lint`

### Getting Help

1. Review workflow logs in GitHub Actions tab
2. Check [CI.md](CI.md) for detailed documentation
3. Review [ARCHITECTURE.md](ARCHITECTURE.md) for visual architecture
4. Review [CLAUDE.md](../CLAUDE.md) for project guidelines

## Maintenance

### Updating Dependencies

```bash
# Update all dependencies
pnpm run update

# Update Socket dependencies only
pnpm run update:socket

# Check for updates
pnpm run taze
```

### Updating Workflows

When updating workflows:
1. Test changes on a branch
2. Monitor CI results carefully
3. Update documentation if behavior changes
4. Consider backward compatibility

### Node Version Updates

When Node releases new versions:
1. Update `node-versions` in workflow files
2. Test thoroughly on new version
3. Update `engines.node` in package.json
4. Update CI.md documentation

## Related Documentation

- [CI Documentation](CI.md) - Comprehensive CI guide
- [Architecture](ARCHITECTURE.md) - Visual workflow architecture
- [CLAUDE.md](../CLAUDE.md) - Development guidelines
