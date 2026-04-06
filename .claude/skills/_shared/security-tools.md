# Security Tools

Shared tool detection for security scanning pipelines.

## AgentShield

Installed as a pinned devDependency (`ecc-agentshield` in pnpm-workspace.yaml catalog).
Run via: `pnpm exec agentshield scan`
No install step needed — available after `pnpm install`.

## Zizmor

Not an npm package. Installed via `pnpm run setup` which downloads the pinned version
from GitHub releases with SHA256 checksum verification (see `external-tools.json`).

Detection: `command -v zizmor` or check `.cache/external-tools/zizmor/*/zizmor`

If not available:
- Warn: "zizmor not installed — run `pnpm run setup` to install"
- Skip the zizmor phase (don't fail the pipeline)

## Socket CLI

Optional. Used for dependency scanning in the updating and security-scan pipelines.

Detection: `command -v socket`

If not available:
- Skip socket-scan phases gracefully
- Note in report: "Socket CLI not available — dependency scan skipped"
