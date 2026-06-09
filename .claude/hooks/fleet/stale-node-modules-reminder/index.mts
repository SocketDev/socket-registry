#!/usr/bin/env node
// Claude Code PostToolUse hook — stale-node-modules-reminder.
//
// After a Bash command fails with a Node module-resolution error for a
// workspace package (commonly the repo's `-stable` self-alias), surface
// the canonical fix: run `pnpm install` to relink node_modules.
//
// Why: `pnpm` symlinks the main checkout's `node_modules` and, after a
// `git worktree remove` / `prune`, can leave those links dangling into
// the removed worktree. The next hook or script that imports a workspace
// package then dies with:
//   Error [ERR_MODULE_NOT_FOUND]: Cannot find package
//   '@socketsecurity/lib-stable' imported from .../pre-commit.mts
// A pre-commit hook hitting this blocks every commit until `pnpm install`
// relinks the store — easy to misread as a content failure.
//
// This hook detects:
//   1. Bash tool calls
//   2. Whose output contains ERR_MODULE_NOT_FOUND / "Cannot find package"
//      for a scoped workspace package (`@<scope>/...`).
//
// On match it writes a stderr reminder to run `pnpm install`. It does NOT
// run the install or retry — the operator decides.
//
// PostToolUse, not PreToolUse: we react to the resolution failure; we
// don't predict it. Fail-open on hook bugs (exit 0).

import process from 'node:process'

interface Payload {
  readonly hook_event_name?: string | undefined
  readonly tool_name?: string | undefined
  readonly tool_response?: unknown | undefined
}

// Both signals together identify a workspace-package resolution break:
// the ERR code (or "Cannot find package") AND a scoped package name. We
// require the scoped name so a generic "module not found" for a typo'd
// relative import doesn't fire.
const ERR_PATTERNS: readonly RegExp[] = [
  /ERR_MODULE_NOT_FOUND/,
  /Cannot find package/,
  /Cannot find module/,
]
const SCOPED_PKG_RE = /@[a-z0-9][\w.-]*\/[\w./-]+/i

// Read the Bash tool_response into a string. Shape is typically
// `{ stdout, stderr, interrupted, isImage }` but harness variants may
// pass a bare string. Walk both.
export function extractOutput(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const parts: string[] = []
    for (const key of ['stdout', 'stderr', 'output', 'content']) {
      const v = obj[key]
      if (typeof v === 'string') {
        parts.push(v)
      }
    }
    return parts.join('\n')
  }
  return ''
}

export function isWorkspaceResolutionBreak(output: string): boolean {
  const hasErr = ERR_PATTERNS.some(re => re.test(output))
  if (!hasErr) {
    return false
  }
  return SCOPED_PKG_RE.test(output)
}

// Pull the first scoped package name out of the output for the message.
export function offendingPackage(output: string): string | undefined {
  const m = SCOPED_PKG_RE.exec(output)
  return m ? m[0] : undefined
}

export function formatReminder(pkg: string | undefined): string {
  const lines: string[] = []
  lines.push('')
  lines.push('ℹ stale-node-modules-reminder')
  lines.push('')
  lines.push(
    `That \`Cannot find package\`${pkg ? ` (${pkg})` : ''} is almost always`,
  )
  lines.push(
    'a dangling pnpm symlink — pnpm relinked the main checkout\'s node_modules',
  )
  lines.push('into a worktree that was since removed/pruned.')
  lines.push('')
  lines.push('Fix: run `pnpm install` in the MAIN checkout to relink, then')
  lines.push('retry the command. Do NOT bypass the failing hook with')
  lines.push('--no-verify — that ships around the real (transient) break.')
  lines.push('')
  return lines.join('\n')
}

async function readStdin(): Promise<string> {
  let raw = ''
  for await (const chunk of process.stdin) {
    raw += chunk
  }
  return raw
}

async function main(): Promise<void> {
  let raw: string
  try {
    raw = await readStdin()
  } catch {
    process.exit(0)
  }
  if (!raw) {
    process.exit(0)
  }
  let payload: Payload
  try {
    payload = JSON.parse(raw) as Payload
  } catch {
    process.exit(0)
  }
  if (payload.hook_event_name !== 'PostToolUse') {
    process.exit(0)
  }
  if (payload.tool_name !== 'Bash') {
    process.exit(0)
  }
  const output = extractOutput(payload.tool_response)
  if (!isWorkspaceResolutionBreak(output)) {
    process.exit(0)
  }
  process.stderr.write(formatReminder(offendingPackage(output)))
  // Exit 0 — informational only; the command already failed.
  process.exit(0)
}

main().catch(() => {
  // Fail-open.
  process.exit(0)
})
