// vitest specs for brew-supply-chain-is-hardened check. The check script
// delegates all detection logic to _shared/brew-supply-chain.mts; that shared
// module exports pure/near-pure functions (brewEnvIsOn, BREW_MIN_VERSION,
// MACOS_BREW_SECURITY_ENV, and constants) whose behaviour is verified here via
// controlled process.env injection. No real `brew` binary is invoked.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  BREW_MIN_VERSION,
  BREW_SUPPLY_CHAIN_DOCS,
  BREW_TAP_TRUST_DOCS,
  brewEnvIsOn,
  MACOS_BREW_SECURITY_ENV,
} from '../../../.claude/hooks/fleet/_shared/brew-supply-chain.mts'

// ── constants ───────────────────────────────────────────────────────────────

describe('BREW_MIN_VERSION', () => {
  test('is 6.0.0', () => {
    assert.equal(BREW_MIN_VERSION, '6.0.0')
  })
})

describe('BREW_TAP_TRUST_DOCS / BREW_SUPPLY_CHAIN_DOCS', () => {
  test('are HTTPS docs.brew.sh URLs', () => {
    assert.match(BREW_TAP_TRUST_DOCS, /^https:\/\/docs\.brew\.sh\//)
    assert.match(BREW_SUPPLY_CHAIN_DOCS, /^https:\/\/docs\.brew\.sh\//)
  })
})

// ── MACOS_BREW_SECURITY_ENV ─────────────────────────────────────────────────

describe('MACOS_BREW_SECURITY_ENV', () => {
  test('contains HOMEBREW_REQUIRE_TAP_TRUST and HOMEBREW_CASK_OPTS_REQUIRE_SHA', () => {
    const names = MACOS_BREW_SECURITY_ENV.map(k => k.name)
    assert.ok(
      names.includes('HOMEBREW_REQUIRE_TAP_TRUST'),
      'tap-trust knob present',
    )
    assert.ok(
      names.includes('HOMEBREW_CASK_OPTS_REQUIRE_SHA'),
      'cask-sha knob present',
    )
  })

  test('every knob has value "1"', () => {
    for (const knob of MACOS_BREW_SECURITY_ENV) {
      assert.equal(knob.value, '1', `${knob.name}.value must be "1"`)
    }
  })

  test('every knob has a non-empty protects string', () => {
    for (const knob of MACOS_BREW_SECURITY_ENV) {
      assert.ok(
        knob.protects.length > 0,
        `${knob.name}.protects must be non-empty`,
      )
    }
  })

  test('is sorted alphabetically by name (fleet ASCII order)', () => {
    const names = MACOS_BREW_SECURITY_ENV.map(k => k.name)
    const sorted = [...names].toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    assert.deepEqual(names, sorted)
  })
})

// ── brewEnvIsOn ─────────────────────────────────────────────────────────────

describe('brewEnvIsOn', () => {
  const VAR = 'BREW_TEST_KNOB_UNIT_TEST_ONLY'

  function withEnv(value: string | undefined, fn: () => void): void {
    const prev = process.env[VAR]
    if (value === undefined) {
      delete process.env[VAR]
    } else {
      process.env[VAR] = value
    }
    try {
      fn()
    } finally {
      if (prev === undefined) {
        delete process.env[VAR]
      } else {
        process.env[VAR] = prev
      }
    }
  }

  test('"1" → on', () => {
    withEnv('1', () => assert.equal(brewEnvIsOn(VAR), true))
  })

  test('"on" → on', () => {
    withEnv('on', () => assert.equal(brewEnvIsOn(VAR), true))
  })

  test('"true" → on', () => {
    withEnv('true', () => assert.equal(brewEnvIsOn(VAR), true))
  })

  test('"yes" → on', () => {
    withEnv('yes', () => assert.equal(brewEnvIsOn(VAR), true))
  })

  test('case-insensitive: "TRUE" and "ON" → on', () => {
    withEnv('TRUE', () => assert.equal(brewEnvIsOn(VAR), true))
    withEnv('ON', () => assert.equal(brewEnvIsOn(VAR), true))
  })

  test('"0" → off (FAIL case: knob not set to a truthy value)', () => {
    withEnv('0', () => assert.equal(brewEnvIsOn(VAR), false))
  })

  test('"false" → off', () => {
    withEnv('false', () => assert.equal(brewEnvIsOn(VAR), false))
  })

  test('empty string → off', () => {
    withEnv('', () => assert.equal(brewEnvIsOn(VAR), false))
  })

  test('unset → off (FAIL case: missing knob flags unhardened)', () => {
    withEnv(undefined, () => assert.equal(brewEnvIsOn(VAR), false))
  })

  test('whitespace-padded "  1  " → on (trimmed)', () => {
    withEnv('  1  ', () => assert.equal(brewEnvIsOn(VAR), true))
  })

  test('arbitrary value like "yes-please" → off', () => {
    withEnv('yes-please', () => assert.equal(brewEnvIsOn(VAR), false))
  })
})

// ── MACOS_BREW_SECURITY_ENV knob enumeration ────────────────────────────────
// Simulate the missing-knob detection path used by detectBrewSecurity.

describe('missingEnv detection (simulated)', () => {
  const VAR_A = 'HOMEBREW_CASK_OPTS_REQUIRE_SHA'
  const VAR_B = 'HOMEBREW_REQUIRE_TAP_TRUST'

  function withBothOff(fn: () => void): void {
    const prevA = process.env[VAR_A]
    const prevB = process.env[VAR_B]
    process.env[VAR_A] = ''
    process.env[VAR_B] = ''
    try {
      fn()
    } finally {
      if (prevA === undefined) {
        delete process.env[VAR_A]
      } else {
        process.env[VAR_A] = prevA
      }
      if (prevB === undefined) {
        delete process.env[VAR_B]
      } else {
        process.env[VAR_B] = prevB
      }
    }
  }

  function withBothOn(fn: () => void): void {
    const prevA = process.env[VAR_A]
    const prevB = process.env[VAR_B]
    process.env[VAR_A] = '1'
    process.env[VAR_B] = '1'
    try {
      fn()
    } finally {
      if (prevA === undefined) {
        delete process.env[VAR_A]
      } else {
        process.env[VAR_A] = prevA
      }
      if (prevB === undefined) {
        delete process.env[VAR_B]
      } else {
        process.env[VAR_B] = prevB
      }
    }
  }

  test('FAIL case: both knobs off → both appear in missingEnv', () => {
    withBothOff(() => {
      const missing = MACOS_BREW_SECURITY_ENV.filter(k => !brewEnvIsOn(k.name))
      assert.equal(missing.length, 2)
      assert.deepEqual(
        missing.map(k => k.name).toSorted(),
        [VAR_A, VAR_B].toSorted(),
      )
    })
  })

  test('PASS case: both knobs on → missingEnv is empty', () => {
    withBothOn(() => {
      const missing = MACOS_BREW_SECURITY_ENV.filter(k => !brewEnvIsOn(k.name))
      assert.equal(missing.length, 0)
    })
  })

  test('partial: only one knob set → exactly one missing', () => {
    const prevA = process.env[VAR_A]
    const prevB = process.env[VAR_B]
    process.env[VAR_A] = '1'
    process.env[VAR_B] = ''
    try {
      const missing = MACOS_BREW_SECURITY_ENV.filter(k => !brewEnvIsOn(k.name))
      assert.equal(missing.length, 1)
      assert.equal(missing[0]!.name, VAR_B)
    } finally {
      if (prevA === undefined) {
        delete process.env[VAR_A]
      } else {
        process.env[VAR_A] = prevA
      }
      if (prevB === undefined) {
        delete process.env[VAR_B]
      } else {
        process.env[VAR_B] = prevB
      }
    }
  })
})
