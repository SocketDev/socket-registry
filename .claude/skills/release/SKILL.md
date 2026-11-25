---
name: release
description: Prepare a Socket Registry release and review its changelog.
---

# Release

1. Run `pnpm run check`, `pnpm test`, and `pnpm run test:npm`.
2. Run `pnpm run bump --help` and use the documented release arguments.
3. Review the changelog and version changes before committing.
4. Use the GitHub Actions publish and release workflows after merge.
