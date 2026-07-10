// vitest spec for the package-manager-auto-update-is-disabled check. The check
// script itself has no exports and runs logic at module scope (not
// entrypoint-guarded), so tests target the pure exported functions from the
// shared module it delegates to:
// .claude/hooks/fleet/_shared/package-manager-auto-update.mts.
// envValue, envIsOn, platformApplies, bypassPhrasesFor, and AUTO_UPDATE_CHECKS
// are exercised with env-var injection via process.env mutation.
// No real git, gh, or network access is needed.

import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { afterEach, beforeEach, describe, test } from 'vitest'

import {
  AUTO_UPDATE_CHECKS,
  BLANKET_BYPASS_PHRASE,
  bypassPhrasesFor,
  envIsOn,
  envValue,
  platformApplies,
} from '../../../.claude/hooks/fleet/_shared/package-manager-auto-update.mts'

// Saved copy of env so we can restore between tests.
let savedEnv: NodeJS.ProcessEnv
beforeEach(() => {
  savedEnv = { ...process.env }
  // Isolate the shell-rc read: point HOME at a fresh empty dir so
  // envOrShellRcIsOn (via getHome()) can't see the operator's real ~/.zshenv. A
  // set-up dev box has NO_UPDATE_NOTIFIER etc. persisted there, which would make
  // the "unset" cases green in clean CI but red on a dev machine.
  process.env['HOME'] = mkdtempSync(path.join(os.tmpdir(), 'pkgmgr-home-'))
})
afterEach(() => {
  // Restore the env snapshot: evict keys added during the test, then reinstate saved values.
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) {
      Reflect.deleteProperty(process.env, key)
    }
  }
  Object.assign(process.env, savedEnv)
})

// Helper: remove an env var key from process.env so envValue sees it as unset.
function unsetEnv(name: string): void {
  Reflect.deleteProperty(process.env, name)
}

describe('envValue', () => {
  test('returns the value when the env var is set to a non-empty string', () => {
    process.env['TEST_PKG_MGMT_VAR'] = 'hello'
    assert.equal(envValue('TEST_PKG_MGMT_VAR'), 'hello')
  })

  test('returns undefined when the env var is unset', () => {
    unsetEnv('TEST_PKG_MGMT_VAR')
    assert.equal(envValue('TEST_PKG_MGMT_VAR'), undefined)
  })

  test('returns undefined when the env var is set to an empty string', () => {
    process.env['TEST_PKG_MGMT_VAR'] = ''
    assert.equal(envValue('TEST_PKG_MGMT_VAR'), undefined)
  })
})

describe('envIsOn', () => {
  const TRUTHY_VALUES = ['1', 'on', 'true', 'yes', 'ON', 'TRUE', 'YES', 'On']
  for (let i = 0, { length } = TRUTHY_VALUES; i < length; i += 1) {
    const val = TRUTHY_VALUES[i]!
    test(`returns true for value "${val}"`, () => {
      process.env['TEST_PKG_MGMT_FLAG'] = val
      assert.equal(envIsOn('TEST_PKG_MGMT_FLAG'), true)
    })
  }

  test('returns false when unset', () => {
    unsetEnv('TEST_PKG_MGMT_FLAG')
    assert.equal(envIsOn('TEST_PKG_MGMT_FLAG'), false)
  })

  test('returns false when set to an empty string', () => {
    process.env['TEST_PKG_MGMT_FLAG'] = ''
    assert.equal(envIsOn('TEST_PKG_MGMT_FLAG'), false)
  })

  test('returns false for a non-truthy value like "0"', () => {
    process.env['TEST_PKG_MGMT_FLAG'] = '0'
    assert.equal(envIsOn('TEST_PKG_MGMT_FLAG'), false)
  })

  test('returns false for a non-truthy value like "false"', () => {
    process.env['TEST_PKG_MGMT_FLAG'] = 'false'
    assert.equal(envIsOn('TEST_PKG_MGMT_FLAG'), false)
  })
})

describe('platformApplies', () => {
  test('"all" always applies regardless of current platform', () => {
    assert.equal(platformApplies('all'), true)
  })

  test('returns true when platform matches the current OS', () => {
    const current = process.platform as 'darwin' | 'linux' | 'win32'
    assert.equal(platformApplies(current), true)
  })

  test('returns false for a platform that does not match the current OS', () => {
    const nonCurrent =
      process.platform === 'darwin'
        ? 'win32'
        : process.platform === 'win32'
          ? 'linux'
          : 'win32'
    assert.equal(platformApplies(nonCurrent as 'win32' | 'linux'), false)
  })
})

describe('AUTO_UPDATE_CHECKS', () => {
  test('each check has a non-empty id, binaries, platform, fix, and detect fn', () => {
    for (const check of AUTO_UPDATE_CHECKS) {
      assert.ok(check.id.length > 0, `${check.id}: id must be non-empty`)
      assert.ok(
        check.binaries.length > 0,
        `${check.id}: binaries must be non-empty`,
      )
      assert.ok(
        typeof check.platform === 'string',
        `${check.id}: platform must be a string`,
      )
      assert.ok(check.fix.length > 0, `${check.id}: fix must be non-empty`)
      assert.equal(
        typeof check.detect,
        'function',
        `${check.id}: detect must be a function`,
      )
    }
  })

  test('known managers are present: homebrew, npm, pnpm', () => {
    const ids = AUTO_UPDATE_CHECKS.map(c => c.id)
    assert.ok(ids.includes('homebrew'), 'homebrew check missing')
    assert.ok(ids.includes('npm'), 'npm check missing')
    assert.ok(ids.includes('pnpm'), 'pnpm check missing')
  })

  test('homebrew platform is darwin', () => {
    const check = AUTO_UPDATE_CHECKS.find(c => c.id === 'homebrew')!
    assert.equal(check.platform, 'darwin')
  })

  test('npm and pnpm platforms are "all"', () => {
    const npm = AUTO_UPDATE_CHECKS.find(c => c.id === 'npm')!
    const pnpm = AUTO_UPDATE_CHECKS.find(c => c.id === 'pnpm')!
    assert.equal(npm.platform, 'all')
    assert.equal(pnpm.platform, 'all')
  })

  test('PASS — compliant: when brew is present and HOMEBREW_NO_AUTO_UPDATE=1, homebrew reports "disabled"', () => {
    const check = AUTO_UPDATE_CHECKS.find(c => c.id === 'homebrew')!
    process.env['HOMEBREW_NO_AUTO_UPDATE'] = '1'
    if (process.platform === 'darwin') {
      const result = check.detect()
      // If brew is absent on this machine, result is "absent" (also compliant).
      // If brew is present, it must be "disabled" because the env var is set.
      assert.ok(
        result.state === 'absent' || result.state === 'disabled',
        `homebrew with HOMEBREW_NO_AUTO_UPDATE=1 must be "disabled" or "absent", got "${result.state}"`,
      )
    }
  })

  test('FAIL — violating: when brew is present and HOMEBREW_NO_AUTO_UPDATE is unset, homebrew reports "enabled"', () => {
    const check = AUTO_UPDATE_CHECKS.find(c => c.id === 'homebrew')!
    unsetEnv('HOMEBREW_NO_AUTO_UPDATE')
    if (process.platform === 'darwin') {
      const result = check.detect()
      if (result.state !== 'absent') {
        assert.equal(
          result.state,
          'enabled',
          `homebrew with HOMEBREW_NO_AUTO_UPDATE unset must report "enabled" when brew is on PATH`,
        )
      }
    }
  })

  test('FAIL — violating: pnpm reports "enabled" when NO_UPDATE_NOTIFIER is unset and pnpm is on PATH', () => {
    unsetEnv('NO_UPDATE_NOTIFIER')
    assert.equal(envIsOn('NO_UPDATE_NOTIFIER'), false)
    const check = AUTO_UPDATE_CHECKS.find(c => c.id === 'pnpm')!
    const result = check.detect()
    assert.ok(
      result.state !== 'disabled',
      `pnpm must not report "disabled" when NO_UPDATE_NOTIFIER is unset; got state="${result.state}"`,
    )
  })

  test('PASS — compliant: pnpm reports "disabled" when NO_UPDATE_NOTIFIER=1', () => {
    process.env['NO_UPDATE_NOTIFIER'] = '1'
    assert.equal(envIsOn('NO_UPDATE_NOTIFIER'), true)
    const check = AUTO_UPDATE_CHECKS.find(c => c.id === 'pnpm')!
    const result = check.detect()
    if (result.state !== 'absent') {
      assert.equal(
        result.state,
        'disabled',
        `pnpm must report "disabled" when NO_UPDATE_NOTIFIER=1 and pnpm is on PATH`,
      )
    }
  })

  test('absent binary for platform-applicable check yields "absent" (never "enabled")', () => {
    for (const check of AUTO_UPDATE_CHECKS) {
      if (!platformApplies(check.platform)) {
        continue
      }
      const result = check.detect()
      if (result.state === 'absent') {
        assert.notEqual(
          result.state,
          'enabled',
          `${check.id}: absent manager must not report "enabled"`,
        )
        assert.equal(result.id, check.id)
        assert.ok(result.reason.length > 0)
        assert.ok(result.fix.length > 0)
      }
    }
  })
})

describe('bypassPhrasesFor', () => {
  test('always includes the blanket bypass phrase', () => {
    for (const check of AUTO_UPDATE_CHECKS) {
      const phrases = bypassPhrasesFor(check)
      assert.ok(
        phrases.includes(BLANKET_BYPASS_PHRASE),
        `${check.id}: blanket phrase missing`,
      )
    }
  })

  test('includes a per-id phrase for each check', () => {
    for (const check of AUTO_UPDATE_CHECKS) {
      const phrases = bypassPhrasesFor(check)
      const idPhrase = `Allow ${check.id} auto-update bypass`
      assert.ok(
        phrases.includes(idPhrase),
        `${check.id}: id-specific phrase "${idPhrase}" missing`,
      )
    }
  })

  test('includes a per-binary phrase for each binary', () => {
    for (const check of AUTO_UPDATE_CHECKS) {
      const phrases = bypassPhrasesFor(check)
      for (const binary of check.binaries) {
        const binPhrase = `Allow ${binary} auto-update bypass`
        assert.ok(
          phrases.includes(binPhrase),
          `${check.id}: binary phrase "${binPhrase}" missing`,
        )
      }
    }
  })

  test('deduplicates phrases when id equals binary name (npm case)', () => {
    const npmCheck = AUTO_UPDATE_CHECKS.find(c => c.id === 'npm')!
    const phrases = bypassPhrasesFor(npmCheck)
    const npmPhraseCount = phrases.filter(
      p => p === `Allow npm auto-update bypass`,
    ).length
    assert.equal(npmPhraseCount, 1, 'duplicate phrase must be deduplicated')
  })

  test('homebrew produces both "Allow homebrew …" and "Allow brew …" phrases', () => {
    const check = AUTO_UPDATE_CHECKS.find(c => c.id === 'homebrew')!
    const phrases = bypassPhrasesFor(check)
    assert.ok(phrases.includes('Allow homebrew auto-update bypass'))
    assert.ok(phrases.includes('Allow brew auto-update bypass'))
  })
})
