#!/usr/bin/env node
// Claude Code PreToolUse hook — prefer-vitest-guard.
//
// Blocks `node --test <file>` Bash commands and steers to the fleet-canonical
// test runner (`node_modules/.bin/vitest run <file>` or `pnpm test`).
//
// Why: fleet repos use vitest for all unit/integration tests. `node --test`
// runs the Node.js built-in test runner which uses a different API surface
// (`describe`/`it` from `node:test` vs vitest). Running the wrong runner
// produces confusing "No test suite found" or silent-pass failures because the
// test files register with vitest's globals, not the node:test runner's.
//
// Also nudges toward targeting a specific file rather than the full suite —
// `node_modules/.bin/vitest run path/to/foo.test.mts` is faster and scoped to
// the change in flight.
//
// Detection: parses the command string for `node ... --test` (flag anywhere)
// or `node --test` (shorthand). The `node --run` form (pnpm/npm built-in
// script runner) is NOT blocked — that's the fleet-canonical way to invoke
// package.json scripts via the node binary.
//
// Bypass: `Allow node-test-runner bypass` typed verbatim in a recent user
// turn.
//
// Fails open on parse / payload errors.

import process from 'node:process'

import { bypassPhrasePresent, readStdin } from '../_shared/transcript.mts'
import { commandsFor } from '../_shared/shell-command.mts'

const BYPASS_PHRASE = 'Allow node-test-runner bypass' as const

interface Payload {
  tool_name?: unknown | undefined
  tool_input?: { command?: unknown | undefined } | undefined
  transcript_path?: unknown | undefined
}

// Matches a test-file path argument (`foo.test.mts`, `bar.spec.ts`, or a
// glob like `test/*.test.mts`).
function looksLikeTestFile(arg: string): boolean {
  return (
    /\.(?:test|spec)\.[cm]?[jt]sx?\b/.test(arg) ||
    /[*?].*\.(?:test|spec)\./.test(arg)
  )
}

function isNodeTestCommand(command: string): {
  detected: boolean
  testFiles: string[]
  reason: 'node --test' | 'tsx loader' | 'tsx runner'
} {
  // (a) `node --test [--import tsx] <files>` — the built-in runner.
  const nodeCmds = commandsFor(command, 'node')
  for (const { args } of nodeCmds) {
    if (!args.includes('--test')) {
      continue
    }
    const testIdx = args.indexOf('--test')
    const files = args.slice(testIdx + 1).filter(a => !a.startsWith('-'))
    // `--import tsx` / `--loader tsx` on a node --test run is the same
    // anti-pattern wearing a TS loader.
    const usesTsx = args.some(a => a === 'tsx' || a.includes('tsx'))
    return {
      detected: true,
      testFiles: files,
      reason: usesTsx ? 'tsx loader' : 'node --test',
    }
  }
  // (b) bare `tsx <file.test.mts>` / `ts-node <file.test.mts>` — running a
  // test file through a TS loader instead of vitest.
  for (const bin of ['tsx', 'ts-node'] as const) {
    const cmds = commandsFor(command, bin)
    for (const { args } of cmds) {
      const files = args.filter(a => looksLikeTestFile(a))
      if (files.length > 0) {
        return { detected: true, testFiles: files, reason: 'tsx runner' }
      }
    }
  }
  return { detected: false, testFiles: [], reason: 'node --test' }
}

async function main(): Promise<void> {
  const raw = await readStdin()
  let payload: Payload
  try {
    payload = JSON.parse(raw) as Payload
  } catch {
    process.exit(0)
  }

  if (payload.tool_name !== 'Bash') {
    process.exit(0)
  }

  const command =
    typeof payload.tool_input?.command === 'string'
      ? payload.tool_input.command
      : ''
  if (!command.trim()) {
    process.exit(0)
  }

  const { detected, testFiles, reason } = isNodeTestCommand(command)
  if (!detected) {
    process.exit(0)
  }

  const transcriptPath =
    typeof payload.transcript_path === 'string'
      ? payload.transcript_path
      : undefined
  if (
    transcriptPath &&
    bypassPhrasePresent(transcriptPath, [BYPASS_PHRASE], 3)
  ) {
    process.exit(0)
  }

  const suggestion =
    testFiles.length > 0
      ? `node_modules/.bin/vitest run ${testFiles.join(' ')}`
      : 'node_modules/.bin/vitest run path/to/your.test.mts'

  const blocked =
    reason === 'node --test'
      ? '`node --test` is the Node.js built-in runner.'
      : reason === 'tsx loader'
        ? '`node --test --import tsx` runs the built-in runner under a TS loader.'
        : '`tsx`/`ts-node` is running a test file directly.'

  process.stderr.write(
    [
      `[prefer-vitest-guard] Blocked: ${blocked}`,
      '',
      '  Fleet repos use vitest for all tests — never node --test, tsx, or',
      '  ts-node as a test runner. Run the specific test file instead:',
      `    ${suggestion}`,
      '',
      '  Or run the full suite:',
      '    pnpm test',
      '',
      '  Targeting a specific file is faster and scopes coverage to your change.',
      '',
      `  Bypass: type "${BYPASS_PHRASE}" to allow it for this invocation.`,
    ].join('\n') + '\n',
  )
  process.exit(2)
}

void main()
