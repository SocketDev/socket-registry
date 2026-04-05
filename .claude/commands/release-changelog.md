Generate a changelog entry for the next release.

Follow the format from CLAUDE.md § "Changelog Management":
- Format: `## [version](https://github.com/SocketDev/socket-registry/releases/tag/vversion) - YYYY-MM-DD`
- Follow [Keep a Changelog](https://keepachangelog.com/)
- Sections: Added, Changed, Fixed, Removed
- User-facing changes only (no internal refactoring, deps, or CI)

Steps:
1. Read current CHANGELOG.md to get the last released version
2. Run `git log --oneline <last-tag>..HEAD` to see all commits since last release
3. Categorize each commit into Added/Changed/Fixed/Removed
4. Skip chore/ci/deps commits unless they affect user-facing behavior
5. Determine version bump: feat → minor, fix → patch, breaking → major
6. Write the new entry at the top of CHANGELOG.md
7. Update version in package.json
8. Present the changelog for review before committing
