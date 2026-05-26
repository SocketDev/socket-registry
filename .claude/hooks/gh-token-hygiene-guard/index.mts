#!/usr/bin/env node
// Claude Code PreToolUse hook — gh-token-hygiene-guard.
//
// Three invariants on `gh` invocations, motivated by the May 2026 Nx
// Console supply-chain compromise:
//
//   1. KEYRING STORAGE. `gh auth status` must report `(keyring)`. The
//      on-disk default at `~/.config/gh/hosts.yml` is exactly what the
//      Nx malware exfiltrated. No bypass — move the token off disk.
//      Fix: `gh auth logout && gh auth login` (keychain is the default
//      since gh 2.40; `--secure-storage` does not exist — the only flag
//      is `--insecure-storage` for opting out, which this hook rejects).
//
//   2. WORKFLOW SCOPE ON-DEMAND. The `workflow` scope grants dispatch
//      power over every workflow including publish / release.
//      Recommended default scope set: `read:org, repo` (the hook does
//      not enforce a scope allowlist; gh itself forces `gist` as a
//      minimum, so the practical floor is `read:org, repo, gist`). To
//      dispatch:
//        a. User types `Allow workflow-scope bypass`.
//        b. Hook allows the next `gh auth refresh -s workflow`.
//        c. The grant is single-use — the next `gh workflow run`
//           consumes it; any further dispatch requires a fresh phrase.
//           User manually re-revokes scope via
//           `gh auth refresh -r workflow` when done.
//
//   3. KEYCHAIN-CLI READ DETECTION. Routing through the existing
//      `no-blind-keychain-read-guard` handles `security
//      find-generic-password` etc. — not duplicated here.
//
// Exit codes:
//   - 0: pass (not a gh command, or all checks satisfied)
//   - 2: block (one of the invariants violated; stderr explains)
//
// Reads a PreToolUse JSON payload from stdin:
//   { "tool_name": "Bash", "tool_input": { "command": "..." } }

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'

import { bypassPhrasePresent, readStdin } from '../_shared/transcript.mts'

// Absolute paths for OS-auth binaries. PATH-hijack defense — a
// malicious npm postinstall that drops ~/.local/bin/sudo, ~/.local/bin/dscl,
// or ~/.local/bin/osascript cannot intercept these calls because spawnSync
// is given the absolute path. These three binaries live in /usr/bin on
// every supported macOS version; if the path doesn't exist, the call
// fails (ENOENT) and the auth path returns 'denied' / 'unsupported',
// which fails closed.
const SUDO_BIN = '/usr/bin/sudo'
const DSCL_BIN = '/usr/bin/dscl'
const OSASCRIPT_BIN = '/usr/bin/osascript'

const BYPASS_PHRASE = 'Allow workflow-scope bypass'
// One bypass phrase authorizes ONE workflow dispatch. The grant file's
// presence = unconsumed. The hook deletes the file immediately after
// letting the dispatch through, so a second dispatch (chain attack or
// genuine re-use) requires a fresh phrase. Token-age (8h) is the
// time-based check; the dispatch gate is single-use.
const WORKFLOW_GRANT_FILE = path.join(
  homedir(),
  '.claude',
  'gh-workflow-grant',
)
const TOKEN_ISSUED_AT_FILE = path.join(
  homedir(),
  '.claude',
  'gh-token-issued-at',
)
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

interface PreToolUsePayload {
  tool_name?: string | undefined
  tool_input?: { command?: string | undefined } | undefined
  transcript_path?: string | undefined
}

interface GhAuthStatus {
  storage: 'keyring' | 'file' | 'unknown'
  scopes: readonly string[]
}

async function main(): Promise<void> {
  const raw = await readStdin()
  let payload: PreToolUsePayload
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch {
    process.exit(0)
  }
  if (payload.tool_name !== 'Bash') {
    process.exit(0)
  }
  const command = payload.tool_input?.command ?? ''
  if (!command) {
    process.exit(0)
  }
  // Cheap pre-filter: only inspect commands that mention `gh`.
  if (!containsGhInvocation(command)) {
    process.exit(0)
  }
  // The auth-status read is the slow path (~50ms). Skip it when the
  // gh command is a known read-only shape that doesn't touch tokens.
  // For now, run on every gh command — paranoid by default.
  let status: GhAuthStatus
  try {
    status = readGhAuthStatus()
  } catch (e) {
    // gh not installed, or no active auth — let the command run and
    // gh itself will report. Don't double-block.
    process.exit(0)
  }
  // Invariant 1: keyring storage.
  if (status.storage === 'file') {
    fail(
      'gh-token-hygiene-guard: gh token is stored on disk',
      [
        'Your gh CLI token lives at ~/.config/gh/hosts.yml. Any local',
        'process can read it (this is exactly the path the Nx Console',
        'supply-chain malware exfiltrated in May 2026).',
        '',
        'Fix:',
        '  gh auth logout',
        '  gh auth login                          # keychain is the default',
        '  gh auth status                         # confirms "(keyring)"',
        '',
        'No bypass — moving the token off disk is non-negotiable.',
      ].join('\n'),
    )
  }
  // Invariant 4 (checked early so the user can self-recover by
  // running `gh auth refresh -h github.com` even when expired).
  if (
    !isAuthMaintenanceCommand(command) &&
    !isTokenFresh()
  ) {
    fail(
      'gh-token-hygiene-guard: gh token is >8h old',
      [
        'The fleet enforces an 8-hour cap on gh token age. Refresh:',
        '  gh auth refresh -h github.com',
        '',
        '(Once refreshed, the hook stamps a local timestamp and',
        'gh commands flow normally again.)',
      ].join('\n'),
    )
  }
  // Stamp the token-issued-at file on ANY auth-refresh / login flow.
  // The actual refresh runs after this hook; stamping pre-emptively is
  // fine because a failed refresh leaves the old token in place (and
  // the next successful refresh re-stamps).
  if (/\bgh\s+auth\s+(?:login|refresh)\b/.test(command)) {
    recordTokenIssuedAt()
  }
  // Invariant 2: workflow scope on-demand.
  const isWorkflowDispatch =
    isWorkflowDispatchCommand(command) || isWorkflowApiDispatch(command)
  const isWorkflowRefresh = isWorkflowScopeRefresh(command)
  const hasWorkflowScope = status.scopes.includes('workflow')
  if (isWorkflowRefresh) {
    // Revoke is always allowed (no bypass needed).
    if (isWorkflowScopeRevoke(command)) {
      process.exit(0)
    }
    // Refresh-add: chat-bypass phrase + Touch ID sudo prompt both
    // required. The phrase alone isn't sufficient — an attacker who
    // exfiltrates the bypass-typed slot still can't proceed without
    // your physical presence.
    if (!bypassPhrasePresent(payload.transcript_path, BYPASS_PHRASE)) {
      fail(
        'gh-token-hygiene-guard: adding workflow scope requires bypass',
        [
          `Type \`${BYPASS_PHRASE}\` in chat before running:`,
          `  ${command}`,
          '',
          'After the phrase, Touch ID will prompt for physical confirmation.',
        ].join('\n'),
      )
    }
    const authResult = requireUserAuthentication()
    if (authResult === 'denied') {
      fail(
        'gh-token-hygiene-guard: physical-presence check failed',
        [
          'Authentication was cancelled or password did not match.',
          'Re-run your command and approve the Touch ID / password prompt.',
        ].join('\n'),
      )
    }
    if (authResult === 'unsupported') {
      fail(
        'gh-token-hygiene-guard: no auth method available',
        [
          'This hook requires either Touch ID (macOS) or an osascript',
          'password prompt to verify physical presence on bypass.',
          'Neither is available in the current environment.',
        ].join('\n'),
      )
    }
    recordWorkflowGrant()
    process.exit(0)
  }
  if (isWorkflowDispatch) {
    // Block if scope is absent — nothing to dispatch with.
    if (!hasWorkflowScope) {
      fail(
        'gh-token-hygiene-guard: workflow dispatch requires workflow scope',
        [
          'Token does not have the `workflow` scope. To dispatch:',
          `  1. Type \`${BYPASS_PHRASE}\` in chat.`,
          '  2. Run: gh auth refresh -h github.com -s workflow',
          '  3. Re-run your dispatch command.',
          '  4. Scope auto-revokes after one dispatch.',
        ].join('\n'),
      )
    }
    // One bypass phrase = one dispatch. Grant file must exist
    // (created when the refresh -s workflow ran with bypass), and
    // we consume it here.
    if (!existsSync(WORKFLOW_GRANT_FILE)) {
      fail(
        'gh-token-hygiene-guard: workflow dispatch grant is missing or already consumed',
        [
          'Token has `workflow` scope, but the dispatch grant is gone.',
          'Each bypass phrase authorizes ONE dispatch.',
          '',
          'To dispatch again:',
          '  1. Run: gh auth refresh -h github.com -r workflow',
          `  2. Type \`${BYPASS_PHRASE}\` in chat.`,
          '  3. Run: gh auth refresh -h github.com -s workflow',
          '  4. Re-run your dispatch command.',
        ].join('\n'),
      )
    }
    consumeWorkflowGrant()
  }
  process.exit(0)
}

function containsGhInvocation(command: string): boolean {
  // Matches `gh ` at start, or after `;`, `&&`, `||`, `|`, `$(`, `` ` ``.
  return /(?:^|[;&|`(])\s*gh\s+/.test(command)
}

function isWorkflowDispatchCommand(command: string): boolean {
  return /\bgh\s+workflow\s+(?:run|dispatch)\b/.test(command)
}

function isWorkflowApiDispatch(command: string): boolean {
  return (
    /\bgh\s+api\b/.test(command) &&
    /\/actions\/workflows\/[^/\s]+\/dispatches\b/.test(command)
  )
}

function isWorkflowScopeRefresh(command: string): boolean {
  // `gh auth refresh -s workflow` (add) OR `-r workflow` (remove).
  // `\b` doesn't match before `-` (non-word→non-word), so anchor with
  // whitespace/start instead.
  return (
    /\bgh\s+auth\s+refresh\b/.test(command) &&
    /(?:^|\s)(?:-s|-r|--scopes|--remove-scopes)\b[^|;&]*\bworkflow\b/.test(command)
  )
}

function isWorkflowScopeRevoke(command: string): boolean {
  return (
    /\bgh\s+auth\s+refresh\b/.test(command) &&
    /(?:^|\s)(?:-r|--remove-scopes)\b[^|;&]*\bworkflow\b/.test(command)
  )
}

function isAuthMaintenanceCommand(command: string): boolean {
  // Self-recovery commands that must run even when the age-block
  // is active. Otherwise the user is locked out.
  return /\bgh\s+auth\s+(?:login|logout|refresh|status)\b/.test(command)
}

function isTokenFresh(): boolean {
  if (!existsSync(TOKEN_ISSUED_AT_FILE)) {
    // First run: stamp now and treat as fresh. This makes the hook
    // ship-able without forcing every developer to re-auth on first
    // upgrade — the 8h clock starts from the moment the hook first
    // observes them.
    recordTokenIssuedAt()
    return true
  }
  try {
    const recorded = Number(readFileSync(TOKEN_ISSUED_AT_FILE, 'utf8'))
    if (!Number.isFinite(recorded)) {
      return false
    }
    return Date.now() - recorded < TOKEN_TTL_MS
  } catch {
    return false
  }
}

function recordTokenIssuedAt(): void {
  try {
    mkdirSync(path.dirname(TOKEN_ISSUED_AT_FILE), { recursive: true })
    writeFileSync(TOKEN_ISSUED_AT_FILE, String(Date.now()), 'utf8')
  } catch {
    // best-effort
  }
}

function readGhAuthStatus(): GhAuthStatus {
  const r = spawnSync('gh', ['auth', 'status'], {
    stdio: 'pipe',
    stdioString: true,
    timeout: 5000,
  })
  const text = String(r.stdout ?? '') + String(r.stderr ?? '')
  if (!text) {
    throw new Error('gh auth status: no output')
  }
  let storage: GhAuthStatus['storage'] = 'unknown'
  if (/\(keyring\)|stored in:\s*keychain/i.test(text)) {
    storage = 'keyring'
  } else if (/Logged in to github\.com/i.test(text) && !/\(keyring\)/i.test(text)) {
    storage = 'file'
  }
  const scopesMatch = text.match(/Token scopes:\s*(.+)/i)
  const scopes = scopesMatch
    ? scopesMatch[1]!.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''))
    : []
  return { storage, scopes }
}

function recordWorkflowGrant(): void {
  try {
    mkdirSync(path.dirname(WORKFLOW_GRANT_FILE), { recursive: true })
    // File presence = grant unconsumed. Body is a timestamp for forensics
    // but the dispatch check is presence-only.
    writeFileSync(WORKFLOW_GRANT_FILE, String(Date.now()), 'utf8')
  } catch {
    // best-effort; if we can't write, the next dispatch will still
    // require a fresh bypass phrase, so no security regression.
  }
}

function consumeWorkflowGrant(): void {
  try {
    rmSync(WORKFLOW_GRANT_FILE, { force: true })
  } catch {
    // best-effort
  }
}

type AuthResult = 'authenticated' | 'denied' | 'unsupported'

/**
 * Verify physical presence via the OS. Tries Touch ID (if sudo is
 * configured with pam_tid.so) first; falls back to an osascript
 * password dialog validated against the user's account.
 *
 * Returns:
 *  'authenticated' — user proved presence
 *  'denied'        — user cancelled or password did not match
 *  'unsupported'   — neither path available (non-macOS, no osascript)
 */
function requireUserAuthentication(): AuthResult {
  // Path 1: Touch ID via sudo (requires pam_tid.so in /etc/pam.d/sudo_local).
  // Invalidate any cached sudo timestamp so the user can't accidentally
  // skip the prompt. -k is silent and always exits 0.
  // Absolute paths for sudo/dscl/osascript defeat PATH-hijack — a
  // malicious npm postinstall that drops ~/.local/bin/sudo cannot
  // intercept these calls.
  spawnSync(SUDO_BIN, ['-k'], { stdio: 'ignore', timeout: 2000 })
  // -n suppresses the TTY password prompt. If pam_tid.so is in the auth
  // stack, sudo presents the Touch ID system dialog (no TTY needed) and
  // -n still allows it to succeed.
  const touchIdResult = spawnSync(SUDO_BIN, ['-n', 'true'], {
    stdio: 'ignore',
    timeout: 30_000,
  })
  if (touchIdResult.status === 0) {
    return 'authenticated'
  }
  // Path 2: osascript password prompt + dscl validation. Works on every
  // Mac, no PAM config required.
  if (process.platform !== 'darwin') {
    return 'unsupported'
  }
  // `display dialog` runs in osascript's own UI process — it does NOT
  // require Automation / System Events permissions (which Claude Code
  // typically doesn't have). Bare `display dialog` works without any
  // privacy prompt the first time.
  const dialogScript =
    'display dialog ' +
    '"Authenticate to authorize workflow scope bypass.\\n\\n' +
    'This step is required even after the chat bypass phrase." ' +
    'default answer "" with hidden answer with title "gh-token-hygiene-guard" ' +
    'buttons {"Cancel", "Authenticate"} default button "Authenticate" with icon caution\n' +
    'return text returned of result'
  const dialog = spawnSync(OSASCRIPT_BIN, ['-e', dialogScript], {
    stdio: ['ignore', 'pipe', 'pipe'],
    stdioString: true,
    timeout: 120_000,
  })
  if (dialog.status !== 0) {
    // User clicked Cancel, or osascript itself failed.
    return 'denied'
  }
  const password = String(dialog.stdout ?? '').replace(/\n$/, '')
  if (!password) {
    return 'denied'
  }
  // Validate against the user's account via dscl. -authonly returns
  // exit 0 on match, non-zero otherwise. The password never touches
  // disk; it flows through stdin only.
  const user = process.env['USER'] ?? ''
  if (!user) {
    return 'unsupported'
  }
  const dscl = spawnSync(DSCL_BIN, ['.', '-authonly', user], {
    stdio: ['pipe', 'ignore', 'ignore'],
    input: password,
    stdioString: true,
    timeout: 10_000,
  })
  if (dscl.status === 0) {
    // Password fallback worked. If Touch ID isn't configured for sudo,
    // surface a one-time educational nudge so the user can set it up
    // and skip the password dialog on future bypasses.
    maybePrintTouchIdSetupNudge()
    return 'authenticated'
  }
  return 'denied'
}

const TOUCH_ID_NUDGED_FILE = path.join(
  homedir(),
  '.claude',
  'gh-touch-id-setup-nudged',
)

function maybePrintTouchIdSetupNudge(): void {
  // Already configured → no nudge needed.
  if (isTouchIdSudoConfigured()) {
    return
  }
  // Already shown the nudge → don't repeat.
  if (existsSync(TOUCH_ID_NUDGED_FILE)) {
    return
  }
  try {
    mkdirSync(path.dirname(TOUCH_ID_NUDGED_FILE), { recursive: true })
    writeFileSync(TOUCH_ID_NUDGED_FILE, String(Date.now()), 'utf8')
  } catch {
    // best-effort; if we can't write the sentinel, the nudge prints
    // again next time — minor annoyance, no security impact.
  }
  process.stderr.write(
    [
      '',
      'TIP — skip the password dialog next time: enable Touch ID for sudo.',
      '',
      'Run this once (copy-paste verbatim; `EOF` must be at column 0,',
      'no leading whitespace, or the heredoc will hang):',
      '',
      'sudo tee /etc/pam.d/sudo_local <<\'EOF\'',
      'auth       sufficient     pam_tid.so',
      'EOF',
      '',
      'What this does:',
      '  /etc/pam.d/sudo_local is macOS Sonoma+\'s sudo PAM extension',
      '  point (Apple\'s officially-supported way to layer auth methods).',
      '  The line adds pam_tid.so as a `sufficient` auth method — meaning',
      '  sudo tries Touch ID first and falls back to your password if',
      '  Touch ID is unavailable (lid closed, no fingerprint enrolled,',
      '  declined). The file is preserved across macOS updates, unlike',
      '  /etc/pam.d/sudo which is replaced on every system upgrade.',
      '',
      'After the one-time setup, this hook\'s bypass-auth step pops a',
      'Touch ID dialog instead of asking for your password.',
      '',
      'This tip is shown once. Full doc:',
      '  docs/claude.md/fleet/gh-token-hygiene.md',
      '',
    ].join('\n'),
  )
}

function isTouchIdSudoConfigured(): boolean {
  // pam_tid.so can be in either /etc/pam.d/sudo_local (Sonoma+ preferred
  // location) or directly in /etc/pam.d/sudo (older systems / manual
  // edits). Either is "configured".
  for (const f of ['/etc/pam.d/sudo_local', '/etc/pam.d/sudo']) {
    try {
      if (existsSync(f)) {
        const content = readFileSync(f, 'utf8')
        // Detect lines like `auth ... pam_tid.so` (whitespace-flexible).
        if (/^\s*auth\b.*\bpam_tid\.so\b/m.test(content)) {
          return true
        }
      }
    } catch {
      // Unreadable → assume not configured.
    }
  }
  return false
}

function fail(headline: string, body: string): never {
  process.stderr.write(`\n${headline}\n\n${body}\n\n`)
  process.exit(2)
}

main().catch(() => {
  // Fail open on internal errors — don't break Claude Code's tool
  // pipeline if our hook itself crashes.
  process.exit(0)
})
