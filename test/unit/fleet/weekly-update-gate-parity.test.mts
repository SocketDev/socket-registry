// PARITY: the gh-aw weekly-update gate and `weekly-update.mts --check-updates`
// must agree on `hasActionableUpdates` for the same repo state. Commit
// 0cdb1010 made the gh-aw `weekly-update.md` check-updates job call
// `weekly-update.mts --check-updates` instead of an inline bash port, so the
// gate is single-sourced through this script: the CLI mode maps the boolean to
// an exit code (0 = updates, 1 = none) the workflow's gate job keys on.
//
// This proves the contract two ways against ONE shimmed repo state:
//   1. the in-process `hasActionableUpdates()` boolean, and
//   2. the `--check-updates` subprocess exit code
// resolve to the same verdict — so the gh-aw gate (which runs the subprocess)
// and the function can never disagree.
//
// The gate shells out to `pnpm outdated` + `pnpm run lockstep --json`. Both arms
// run under a PATH shim that controls those commands' output, so the verdict is
// deterministic and offline (no real registry / lockstep run).

import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'
import { test } from 'vitest'

const WEEKLY_UPDATE_MTS = fileURLToPath(
  new URL('../../../scripts/fleet/weekly-update.mts', import.meta.url),
)

// Write a fake `pnpm` shim that prints the given `outdated` output and exits
// `lockstepCode` for `pnpm run lockstep --json`. Returns a PATH-prepend dir.
function shimDir(options: {
  outdatedOut: string
  lockstepCode: number
}): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'weekly-gate-parity-'))
  const pnpm = path.join(dir, 'pnpm')
  // The gate runs `pnpm outdated` (capture) and `pnpm run lockstep --json`.
  const script = `#!/bin/sh
case "$1" in
  outdated)
    printf '%s' ${JSON.stringify(options.outdatedOut)}
    exit 0
    ;;
  run)
    # \`pnpm run lockstep --json\`
    exit ${options.lockstepCode}
    ;;
esac
exit 0
`
  writeFileSync(pnpm, script)
  chmodSync(pnpm, 0o755)
  return dir
}

// Run BOTH arms under the same shimmed PATH and assert they agree.
function assertParity(options: {
  label: string
  outdatedOut: string
  lockstepCode: number
  expectedActionable: boolean
}): void {
  const dir = shimDir(options)
  const env = {
    ...process.env,
    PATH: `${dir}${path.delimiter}${process.env['PATH'] ?? ''}`,
  }

  // Arm 1: the in-process function (the single source of the gate logic).
  const fnDriver = `
    import { hasActionableUpdates } from ${JSON.stringify(WEEKLY_UPDATE_MTS)}
    process.stdout.write((await hasActionableUpdates()) ? 'true' : 'false')
  `
  const fnRun = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', fnDriver],
    {
      env,
      stdioString: true,
    },
  )
  assert.equal(
    fnRun.status,
    0,
    `[${options.label}] fn driver failed: ${String(fnRun.stderr)}`,
  )
  const fnActionable = String(fnRun.stdout).trim() === 'true'

  // Arm 2: the `--check-updates` subprocess (what the gh-aw gate job runs).
  // Exit 0 = updates available, exit 1 = nothing actionable.
  const cliRun = spawnSync(
    process.execPath,
    [WEEKLY_UPDATE_MTS, '--check-updates'],
    {
      env,
      stdioString: true,
    },
  )
  const cliActionable = cliRun.status === 0

  // Parity: the function boolean and the CLI exit code agree, and both match
  // the expected verdict for this shimmed state.
  assert.equal(
    fnActionable,
    cliActionable,
    `[${options.label}] gate disagreement: fn=${fnActionable} cli-exit=${String(cliRun.status)}`,
  )
  assert.equal(
    fnActionable,
    options.expectedActionable,
    `[${options.label}] expected actionable=${options.expectedActionable}`,
  )
}

test('parity: outdated drift → both say actionable (exit 0)', () => {
  assertParity({
    expectedActionable: true,
    label: 'outdated-drift',
    lockstepCode: 0,
    outdatedOut: 'Package  Current  Latest\nfoo      1.0.0    2.0.0\n',
  })
})

test('parity: lockstep behind (exit 2) → both say actionable (exit 0)', () => {
  assertParity({
    expectedActionable: true,
    label: 'lockstep-behind',
    lockstepCode: 2,
    outdatedOut: 'No outdated dependencies\n',
  })
})

test('parity: nothing outdated + lockstep clean → both say not-actionable (exit 1)', () => {
  assertParity({
    expectedActionable: false,
    label: 'clean',
    lockstepCode: 0,
    outdatedOut: 'No outdated dependencies\n',
  })
})
