Run a security scan of the project via `pnpm run security`, or manually:

## 1. Claude Code configuration security

Run `pnpm exec agentshield scan` to check `.claude/` for:
- Hardcoded secrets in CLAUDE.md and settings
- Overly permissive tool allow lists (e.g. `Bash(*)`)
- Prompt injection patterns in agent definitions
- Command injection risks in hooks
- Risky MCP server configurations

## 2. GitHub Actions workflow security

Run `zizmor .github/` to scan all workflows for:
- Unpinned actions (should use full SHA, not tags)
- Secrets used outside `env:` blocks
- Injection risks from untrusted inputs
- Overly permissive permissions

If zizmor is not installed, skip with a message. Install via `brew install zizmor` or see https://docs.zizmor.sh/installation/.

Report all findings with severity levels. Fix CRITICAL and HIGH findings immediately.
