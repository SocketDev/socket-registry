#!/usr/bin/env node
// Claude Code PostToolUse hook — shared-workflow-cascade (repo-specific).
//
// TRIGGER: After any Bash tool call that commits or pushes a change to
// a shared workflow file in socket-registry (.github/workflows/ci.yml,
// .github/workflows/provenance.yml, or any _local-not-for-reuse-*.yml).
//
// WHAT IT DOES: When a shared workflow file changes on main, the
// consuming fleet repos have stale SHA pins. This hook emits a REMINDER
// that blocks Claude from moving on until it has propagated the new
// propagation SHA to all consumer repos via the /updating-workflows
// skill (Phase 4 in the skill doc).
//
// WHY A HOOK RATHER THAN INLINE: Claude routinely runs cascade-workflows,
// lands the Layer 4 commit, then moves on without touching external
// consumers. The hook breaks that flow: it fires the moment a shared
// workflow file is committed, and refuses to proceed until the agent
// acknowledges the propagation obligation.
//
// DETECTION: inspects the latest commit on the current branch for
// changes to the canonical shared-workflow paths:
//   - .github/workflows/ci.yml         (Layer 3 reusable workflow)
//   - .github/workflows/provenance.yml (Layer 3 reusable workflow)
//   - .github/workflows/_local-not-for-reuse-*.yml  (Layer 4 — signals cascade complete)
//
// EXIT 2 = block (with error message to stderr).
// EXIT 0 = allow (no shared workflow file changed, or already propagated).
//
// Fails open on errors (exit 0 + stderr log).

import process from 'node:process'
import { spawnSync } from 'node:child_process'

import { bypassPhrasePresent, readStdin } from '../../fleet/_shared/transcript.mts'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

const logger = getDefaultLogger()

// The bypass phrase for one-off overrides (e.g. trivial doc-only changes
// that the agent knows haven't changed any action behaviour).
const BYPASS_PHRASE = 'Allow workflow-cascade bypass'

// Shared workflow files whose change triggers the cascade obligation.
const SHARED_WORKFLOW_PATTERNS: readonly RegExp[] = [
  /\.github\/workflows\/ci\.yml$/,
  /\.github\/workflows\/provenance\.yml$/,
  /\.github\/workflows\/_local-not-for-reuse-.*\.yml$/,
]

interface HookInput {
  tool_name?: string
  tool_input?: { command?: string }
  tool_result?: { content?: unknown }
  transcript_path?: string
}

function git(...args: string[]): string {
  const r = spawnSync('git', args, { encoding: 'utf8' })
  return r.stdout.trim()
}

function sharedWorkflowsChangedInLastCommit(): string[] {
  // Get the list of files changed in the most recent commit on HEAD.
  const files = git('diff', '--name-only', 'HEAD^', 'HEAD').split('\n').filter(Boolean)
  return files.filter(f => SHARED_WORKFLOW_PATTERNS.some(re => re.test(f)))
}

function isRelevantCommand(command: string): boolean {
  // Only care about commands that push or commit.
  return /\bgit\b.*\b(push|commit)\b/.test(command)
}

async function main(): Promise<void> {
  let input: HookInput = {}
  try {
    const raw = await readStdin()
    input = JSON.parse(raw) as HookInput
  } catch {
    return
  }

  if (input.tool_name !== 'Bash') {
    return
  }

  const command = input.tool_input?.command ?? ''
  if (!isRelevantCommand(command)) {
    return
  }

  // Check if the last commit touched shared workflow files.
  let changedFiles: string[]
  try {
    changedFiles = sharedWorkflowsChangedInLastCommit()
  } catch {
    return
  }

  if (changedFiles.length === 0) {
    return
  }

  // Bypass if the agent already has explicit authorisation.
  if (bypassPhrasePresent(input.transcript_path, BYPASS_PHRASE)) {
    return
  }

  const fileList = changedFiles.map(f => `  ${f}`).join('\n')

  process.stderr.write(
    `[shared-workflow-cascade] BLOCKED — shared workflow file(s) changed:\n` +
    `${fileList}\n\n` +
    `These files carry the propagation SHA consumed by ALL fleet repos.\n` +
    `You MUST run Phase 4 of the /updating-workflows skill before moving on:\n\n` +
    `  For each consumer (socket-btm, socket-cli, socket-lib, socket-sdk-js,\n` +
    `  socket-packageurl-js, sdxgen, ultrathink):\n` +
    `    1. Update the SocketDev/socket-registry@<sha> pin to the propagation SHA.\n` +
    `    2. Commit + push (direct push or PR per each repo's branch protection).\n\n` +
    `The propagation SHA is the Layer 3 merge commit on origin/main:\n` +
    `  git fetch origin && git rev-parse origin/main\n\n` +
    `Gate: the propagation SHA's own CI must be green before any consumer update.\n\n` +
    `To skip this check (ONLY for non-behavioural changes like doc-only edits):\n` +
    `  Type "${BYPASS_PHRASE}" in your next message.\n`,
  )
  process.exit(2)
}

main().catch(err => {
  logger.error('shared-workflow-cascade: unexpected error', err)
})
