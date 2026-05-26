// node --test specs for the gh-token-hygiene-guard hook.
//
// The hook shells out to `gh auth status`. To make tests deterministic
// we stage a fake `gh` binary on PATH that prints scripted output, and
// point the timestamp-file env override at a tmpdir so grant state
// doesn't bleed between tests.

import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'

const here = path.dirname(fileURLToPath(import.meta.url))
const HOOK = path.join(here, '..', 'index.mts')

type Result = { code: number; stderr: string }

interface RunOptions {
  // What the fake `gh auth status` should print.
  ghStatusOutput?: string
  // Pretend a transcript with this body exists. Path passed as
  // transcript_path to the hook.
  transcriptText?: string
  // The Bash command to feed via tool_input.command.
  command: string
  // Pre-create the workflow-grant file (presence = unconsumed grant).
  hasGrant?: boolean
}

async function runHook(
  opts: RunOptions,
): Promise<Result & { grantStillExists: boolean }> {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'gh-hyg-'))
  // Fake gh binary: prints scripted output to stdout, exits 0.
  const fakeGh = path.join(tmp, 'gh')
  const body = (opts.ghStatusOutput ?? '').replace(/'/g, "'\\''")
  writeFileSync(fakeGh, `#!/bin/sh\nprintf '%s\\n' '${body}'\n`)
  chmodSync(fakeGh, 0o755)
  // Fake HOME so the grant file lands in tmpdir.
  const fakeHome = path.join(tmp, 'home')
  mkdirSync(path.join(fakeHome, '.claude'), { recursive: true })
  const grantFile = path.join(fakeHome, '.claude', 'gh-workflow-grant')
  if (opts.hasGrant) {
    writeFileSync(grantFile, String(Date.now()))
  }
  let transcriptPath: string | undefined
  if (opts.transcriptText !== undefined) {
    transcriptPath = path.join(tmp, 'transcript.jsonl')
    // Minimal transcript line shape: { role: 'user', content: '...' }
    writeFileSync(
      transcriptPath,
      JSON.stringify({
        type: 'user',
        message: { content: opts.transcriptText },
      }) + '\n',
    )
  }
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${tmp}${path.delimiter}${process.env['PATH'] ?? ''}`,
    HOME: fakeHome,
  }
  const child = spawn(process.execPath, [HOOK], { stdio: 'pipe', env })
  void child.catch(() => undefined)
  child.stdin!.end(
    JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command: opts.command },
      transcript_path: transcriptPath,
    }),
  )
  let stderr = ''
  child.process.stderr!.on('data', chunk => {
    stderr += chunk.toString('utf8')
  })
  return new Promise<Result & { grantStillExists: boolean }>(resolve => {
    child.process.on('exit', code => {
      // Inspect grant file BEFORE cleanup
      let grantStillExists = false
      try {
        grantStillExists = existsSync(grantFile)
      } catch {}
      try {
        rmSync(tmp, { recursive: true, force: true })
      } catch {}
      resolve({ code: code ?? 0, stderr, grantStillExists })
    })
  })
}

const KEYRING_OUTPUT_NO_WORKFLOW = [
  'github.com',
  '  ✓ Logged in to github.com account jdalton (keyring)',
  "  - Token scopes: 'read:org', 'repo'",
].join('\n')

const KEYRING_OUTPUT_WITH_WORKFLOW = [
  'github.com',
  '  ✓ Logged in to github.com account jdalton (keyring)',
  "  - Token scopes: 'read:org', 'repo', 'workflow'",
].join('\n')

const FILE_STORAGE_OUTPUT = [
  'github.com',
  '  ✓ Logged in to github.com account jdalton',
  "  - Token scopes: 'read:org', 'repo'",
].join('\n')

test('non-gh Bash passes', async () => {
  const r = await runHook({
    command: 'ls -la',
    ghStatusOutput: KEYRING_OUTPUT_NO_WORKFLOW,
  })
  assert.strictEqual(r.code, 0)
})

test('on-disk gh storage is blocked', async () => {
  const r = await runHook({
    command: 'gh pr list',
    ghStatusOutput: FILE_STORAGE_OUTPUT,
  })
  assert.strictEqual(r.code, 2)
  assert.match(r.stderr, /stored on disk/)
})

test('keyring storage + non-dispatch gh command passes', async () => {
  const r = await runHook({
    command: 'gh pr list',
    ghStatusOutput: KEYRING_OUTPUT_NO_WORKFLOW,
  })
  assert.strictEqual(r.code, 0)
})

test('workflow dispatch without workflow scope is blocked', async () => {
  const r = await runHook({
    command: 'gh workflow run publish.yml',
    ghStatusOutput: KEYRING_OUTPUT_NO_WORKFLOW,
  })
  assert.strictEqual(r.code, 2)
  assert.match(r.stderr, /workflow scope/i)
})

test('workflow dispatch with scope + unconsumed grant passes', async () => {
  const r = await runHook({
    command: 'gh workflow run publish.yml',
    ghStatusOutput: KEYRING_OUTPUT_WITH_WORKFLOW,
    hasGrant: true,
  })
  assert.strictEqual(r.code, 0)
})

test('workflow dispatch consumes the grant (single-use)', async () => {
  const r = await runHook({
    command: 'gh workflow run publish.yml',
    ghStatusOutput: KEYRING_OUTPUT_WITH_WORKFLOW,
    hasGrant: true,
  })
  assert.strictEqual(r.code, 0)
  assert.strictEqual(
    r.grantStillExists,
    false,
    'grant file should be deleted after a single dispatch',
  )
})

test('workflow dispatch with scope + missing grant is blocked', async () => {
  const r = await runHook({
    command: 'gh workflow run publish.yml',
    ghStatusOutput: KEYRING_OUTPUT_WITH_WORKFLOW,
  })
  assert.strictEqual(r.code, 2)
  assert.match(r.stderr, /missing or already consumed/)
})

test('refresh -s workflow without bypass is blocked', async () => {
  const r = await runHook({
    command: 'gh auth refresh -h github.com -s workflow',
    ghStatusOutput: KEYRING_OUTPUT_NO_WORKFLOW,
  })
  assert.strictEqual(r.code, 2)
  assert.match(r.stderr, /requires bypass/)
})

// Bypass-phrase normalization (hyphen vs space, em-dashes, etc.) is
// unit-tested directly in _shared/transcript.test.mts. End-to-end
// here only verifies block/allow behavior at the hook boundary;
// the OS-auth path (sudo + dscl + osascript on absolute /usr/bin/
// paths) is intentionally unreachable in unit tests — testing it
// would require either an env-var bypass (rejected on security
// grounds) or a /usr/bin/ overlay (rejected as fragile / dangerous).
// The auth path is exercised by manual smoke-testing on the
// developer's machine when the hook ships.

test('refresh -s workflow with bypass phrase reaches the auth path', async () => {
  // The bypass phrase is present, so the hook will attempt OS-auth.
  // /usr/bin/sudo will fail under CI because no Touch ID and the
  // -n flag (no password prompt) is set; /usr/bin/dscl is also
  // unreachable without a real password. The hook returns 'denied'
  // and blocks. This proves the bypass phrase IS being detected
  // (the hook reaches the auth path) without exercising the OS auth.
  const r = await runHook({
    command: 'gh auth refresh -h github.com -s workflow',
    ghStatusOutput: KEYRING_OUTPUT_NO_WORKFLOW,
    transcriptText: 'Allow workflow-scope bypass',
  })
  // Either 'denied' (auth failed) or 'unsupported' (no osascript)
  // — both are exit 2 with a recognizable stderr.
  assert.strictEqual(r.code, 2)
  assert.match(
    r.stderr,
    /physical-presence check failed|no auth method available/,
  )
})

test('refresh -r workflow (revoke) passes without bypass', async () => {
  const r = await runHook({
    command: 'gh auth refresh -h github.com -r workflow',
    ghStatusOutput: KEYRING_OUTPUT_WITH_WORKFLOW,
  })
  assert.strictEqual(r.code, 0)
})

test('gh api workflow dispatch shape is also blocked', async () => {
  const r = await runHook({
    command:
      'gh api -X POST repos/foo/bar/actions/workflows/publish.yml/dispatches -f ref=main',
    ghStatusOutput: KEYRING_OUTPUT_NO_WORKFLOW,
  })
  assert.strictEqual(r.code, 2)
})

test('expired token age (>8h) blocks non-auth commands', async () => {
  // Pre-stamp the issued-at file with an old timestamp by running
  // through the hook with HOME pointing at our tmpdir.
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'gh-age-'))
  const fakeHome = path.join(tmp, 'home')
  mkdirSync(path.join(fakeHome, '.claude'), { recursive: true })
  writeFileSync(
    path.join(fakeHome, '.claude', 'gh-token-issued-at'),
    String(Date.now() - 9 * 60 * 60 * 1000), // 9h ago
  )
  const fakeGh = path.join(tmp, 'gh')
  writeFileSync(
    fakeGh,
    `#!/bin/sh\nprintf '%s\\n' '${KEYRING_OUTPUT_NO_WORKFLOW.replace(/'/g, "'\\''")}'\n`,
  )
  chmodSync(fakeGh, 0o755)
  const child = spawn(process.execPath, [HOOK], {
    stdio: 'pipe',
    env: {
      ...process.env,
      PATH: `${tmp}${path.delimiter}${process.env['PATH'] ?? ''}`,
      HOME: fakeHome,
    },
  })
  void child.catch(() => undefined)
  child.stdin!.end(
    JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command: 'gh pr list' },
    }),
  )
  let stderr = ''
  child.process.stderr!.on('data', chunk => {
    stderr += chunk.toString('utf8')
  })
  const code = await new Promise<number>(resolve => {
    child.process.on('exit', c => {
      try {
        rmSync(tmp, { recursive: true, force: true })
      } catch {}
      resolve(c ?? 0)
    })
  })
  assert.strictEqual(code, 2)
  assert.match(stderr, />8h old/)
})

test('expired token age allows gh auth refresh (self-recovery)', async () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'gh-age-r-'))
  const fakeHome = path.join(tmp, 'home')
  mkdirSync(path.join(fakeHome, '.claude'), { recursive: true })
  writeFileSync(
    path.join(fakeHome, '.claude', 'gh-token-issued-at'),
    String(Date.now() - 9 * 60 * 60 * 1000),
  )
  const fakeGh = path.join(tmp, 'gh')
  writeFileSync(
    fakeGh,
    `#!/bin/sh\nprintf '%s\\n' '${KEYRING_OUTPUT_NO_WORKFLOW.replace(/'/g, "'\\''")}'\n`,
  )
  chmodSync(fakeGh, 0o755)
  const child = spawn(process.execPath, [HOOK], {
    stdio: 'pipe',
    env: {
      ...process.env,
      PATH: `${tmp}${path.delimiter}${process.env['PATH'] ?? ''}`,
      HOME: fakeHome,
    },
  })
  void child.catch(() => undefined)
  child.stdin!.end(
    JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command: 'gh auth refresh -h github.com' },
    }),
  )
  const code = await new Promise<number>(resolve => {
    child.process.on('exit', c => {
      try {
        rmSync(tmp, { recursive: true, force: true })
      } catch {}
      resolve(c ?? 0)
    })
  })
  assert.strictEqual(code, 0)
})

