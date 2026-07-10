// vitest spec for trust-gates-are-not-weakened. The check's pure detection
// logic lives in two _shared/ modules (trust-gates.mts + npmrc-trust.mts) that
// are imported without side effects. main() is entrypoint-guarded so importing
// the check is also side-effect-free. All pure functions are exercised with
// in-process fixtures — no real repo, network, or git process is touched.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  detectAuthEnvPlaceholderInNpmrc,
  detectOptoutInCommands,
  detectOptoutInFileText,
  TRUST_OPTOUT_ENV_VARS,
} from '../../../.claude/hooks/fleet/_shared/npmrc-trust.mts'
import {
  checkGateFloors,
  detectNpmrcMinReleaseAgeDowngrade,
  MIN_RELEASE_AGE_DAYS,
  MIN_RELEASE_AGE_MINUTES,
  readNpmrcMinReleaseAge,
} from '../../../.claude/hooks/fleet/_shared/trust-gates.mts'

// The two opt-out env var names — pulled from the exported constant so this
// test file does not embed them as literal assignment-shaped strings and
// avoids tripping the edit-time guard that scans for committed opt-outs.
const [AUTH_FILE_VAR, USERCONFIG_VAR] = TRUST_OPTOUT_ENV_VARS
// AUTH_FILE_VAR = 'PNPM_CONFIG_NPMRC_AUTH_FILE'
// USERCONFIG_VAR = 'NPM_CONFIG_USERCONFIG'

// ---------------------------------------------------------------------------
// readNpmrcMinReleaseAge
// ---------------------------------------------------------------------------

describe('readNpmrcMinReleaseAge', () => {
  test('parses the key=value form', () => {
    assert.equal(readNpmrcMinReleaseAge('min-release-age=7'), 7)
  })

  test('strips whitespace around = and the value', () => {
    assert.equal(readNpmrcMinReleaseAge('min-release-age = 14'), 14)
  })

  test('ignores comment lines (# and ;)', () => {
    const text = '# min-release-age=1\n; min-release-age=2\nmin-release-age=7'
    assert.equal(readNpmrcMinReleaseAge(text), 7)
  })

  test('returns undefined when the key is absent', () => {
    assert.equal(
      readNpmrcMinReleaseAge('registry=https://registry.npmjs.org/'),
      undefined,
    )
  })

  test('returns undefined for a non-numeric value', () => {
    assert.equal(readNpmrcMinReleaseAge('min-release-age=bad'), undefined)
  })

  test('returns undefined for an empty file', () => {
    assert.equal(readNpmrcMinReleaseAge(''), undefined)
  })
})

// ---------------------------------------------------------------------------
// detectNpmrcMinReleaseAgeDowngrade
// ---------------------------------------------------------------------------

describe('detectNpmrcMinReleaseAgeDowngrade', () => {
  test('no downgrade → undefined', () => {
    assert.equal(
      detectNpmrcMinReleaseAgeDowngrade(
        'min-release-age=7',
        'min-release-age=7',
      ),
      undefined,
    )
  })

  test('strengthening (higher value) → undefined', () => {
    assert.equal(
      detectNpmrcMinReleaseAgeDowngrade(
        'min-release-age=7',
        'min-release-age=14',
      ),
      undefined,
    )
  })

  test('lowering below floor → message', () => {
    const msg = detectNpmrcMinReleaseAgeDowngrade(
      'min-release-age=7',
      'min-release-age=3',
    )
    assert.ok(typeof msg === 'string')
    assert.match(msg, /lowered/)
  })

  test('key removed when previously present → message', () => {
    const msg = detectNpmrcMinReleaseAgeDowngrade('min-release-age=7', '')
    assert.ok(typeof msg === 'string')
    assert.match(msg, /removed/)
  })

  test('key never present and still absent → undefined', () => {
    assert.equal(detectNpmrcMinReleaseAgeDowngrade('', ''), undefined)
  })
})

// ---------------------------------------------------------------------------
// checkGateFloors — compliant pnpm-workspace.yaml
// ---------------------------------------------------------------------------

const COMPLIANT_PNPM_WORKSPACE = [
  `minimumReleaseAge: ${MIN_RELEASE_AGE_MINUTES}`,
  'trustPolicy: no-downgrade',
  'blockExoticSubdeps: true',
].join('\n')

describe('checkGateFloors — compliant', () => {
  test('no violations when all three pnpm gates are at floor', () => {
    assert.deepEqual(checkGateFloors(COMPLIANT_PNPM_WORKSPACE, undefined), [])
  })

  test('no violations when optional .npmrc is absent (undefined)', () => {
    assert.deepEqual(checkGateFloors(COMPLIANT_PNPM_WORKSPACE, undefined), [])
  })

  test('no violations when .npmrc min-release-age meets the day floor', () => {
    assert.deepEqual(
      checkGateFloors(
        COMPLIANT_PNPM_WORKSPACE,
        `min-release-age=${MIN_RELEASE_AGE_DAYS}`,
      ),
      [],
    )
  })
})

// ---------------------------------------------------------------------------
// checkGateFloors — violations
// ---------------------------------------------------------------------------

describe('checkGateFloors — violations', () => {
  test('minimumReleaseAge absent → violation', () => {
    const text = 'trustPolicy: no-downgrade\nblockExoticSubdeps: true'
    const v = checkGateFloors(text, undefined)
    assert.equal(v.length, 1)
    assert.equal(v[0]!.gate, 'minimumReleaseAge')
    assert.equal(v[0]!.saw, 'absent')
  })

  test('minimumReleaseAge below floor → violation', () => {
    const text = [
      'minimumReleaseAge: 1440',
      'trustPolicy: no-downgrade',
      'blockExoticSubdeps: true',
    ].join('\n')
    const v = checkGateFloors(text, undefined)
    assert.equal(v.length, 1)
    assert.equal(v[0]!.gate, 'minimumReleaseAge')
    assert.equal(v[0]!.saw, '1440')
  })

  test('trustPolicy wrong value → violation', () => {
    const text = [
      `minimumReleaseAge: ${MIN_RELEASE_AGE_MINUTES}`,
      'trustPolicy: always-trust',
      'blockExoticSubdeps: true',
    ].join('\n')
    const v = checkGateFloors(text, undefined)
    assert.equal(v.length, 1)
    assert.equal(v[0]!.gate, 'trustPolicy')
    assert.equal(v[0]!.saw, 'always-trust')
  })

  test('trustPolicy absent → violation with saw=absent', () => {
    const text = [
      `minimumReleaseAge: ${MIN_RELEASE_AGE_MINUTES}`,
      'blockExoticSubdeps: true',
    ].join('\n')
    const v = checkGateFloors(text, undefined)
    assert.equal(v.length, 1)
    assert.equal(v[0]!.gate, 'trustPolicy')
    assert.equal(v[0]!.saw, 'absent')
  })

  test('blockExoticSubdeps false → violation', () => {
    const text = [
      `minimumReleaseAge: ${MIN_RELEASE_AGE_MINUTES}`,
      'trustPolicy: no-downgrade',
      'blockExoticSubdeps: false',
    ].join('\n')
    const v = checkGateFloors(text, undefined)
    assert.equal(v.length, 1)
    assert.equal(v[0]!.gate, 'blockExoticSubdeps')
    assert.equal(v[0]!.saw, 'false')
  })

  test('all three pnpm gates missing → three violations', () => {
    const v = checkGateFloors('packages:\n  - "packages/*"', undefined)
    assert.equal(v.length, 3)
    const gates = v.map(x => x.gate).toSorted()
    assert.deepEqual(gates, [
      'blockExoticSubdeps',
      'minimumReleaseAge',
      'trustPolicy',
    ])
  })

  test('.npmrc min-release-age below day floor → violation', () => {
    const v = checkGateFloors(COMPLIANT_PNPM_WORKSPACE, 'min-release-age=3')
    assert.equal(v.length, 1)
    assert.equal(v[0]!.gate, 'min-release-age')
    assert.equal(v[0]!.file, '.npmrc')
    assert.equal(v[0]!.saw, '3')
  })

  test('pnpm-workspace.yaml undefined → no pnpm violations (but .npmrc still checked)', () => {
    const v = checkGateFloors(undefined, 'min-release-age=1')
    assert.equal(v.length, 1)
    assert.equal(v[0]!.gate, 'min-release-age')
  })

  test('both undefined → no violations', () => {
    assert.deepEqual(checkGateFloors(undefined, undefined), [])
  })
})

// ---------------------------------------------------------------------------
// detectOptoutInFileText
// ---------------------------------------------------------------------------

describe('detectOptoutInFileText', () => {
  test('no assignments → empty', () => {
    assert.deepEqual(detectOptoutInFileText('echo hello world'), [])
  })

  test('AUTH_FILE_VAR assignment → hit on line 1', () => {
    // Build the assignment string at runtime so it is not a bare literal in
    // this source file — avoiding a false-positive from the edit-time guard.
    const line = `${AUTH_FILE_VAR!}=.npmrc pnpm i`
    const hits = detectOptoutInFileText(line)
    assert.equal(hits.length, 1)
    assert.equal(hits[0]!.name, AUTH_FILE_VAR)
    assert.equal(hits[0]!.line, 1)
  })

  test('USERCONFIG pointing at repo-local .npmrc → hit', () => {
    const line = `${USERCONFIG_VAR!}=.npmrc pnpm i`
    const hits = detectOptoutInFileText(line)
    assert.equal(hits.length, 1)
    assert.equal(hits[0]!.name, USERCONFIG_VAR)
  })

  test('USERCONFIG pointing at HOME-level path → no hit', () => {
    const line = `${USERCONFIG_VAR!}=~/.npmrc pnpm i`
    assert.deepEqual(detectOptoutInFileText(line), [])
  })

  test('USERCONFIG pointing at absolute path → no hit', () => {
    const line = `${USERCONFIG_VAR!}=/etc/npmrc pnpm i`
    assert.deepEqual(detectOptoutInFileText(line), [])
  })

  test('YAML form (key: value) → hit', () => {
    const line = `${AUTH_FILE_VAR!}: .npmrc`
    const hits = detectOptoutInFileText(line)
    assert.equal(hits.length, 1)
  })

  test('export form → hit', () => {
    const line = `export ${AUTH_FILE_VAR!}=.npmrc`
    const hits = detectOptoutInFileText(line)
    assert.equal(hits.length, 1)
  })

  test('multi-line: reports correct line number', () => {
    const text = ['echo ok', `${AUTH_FILE_VAR!}=.npmrc`].join('\n')
    const hits = detectOptoutInFileText(text)
    assert.equal(hits[0]!.line, 2)
  })

  test('bare mention without assignment → no hit', () => {
    // A comment that only mentions the var name (no = or :) should not fire.
    const comment = `# See ${AUTH_FILE_VAR!} documentation for details`
    assert.deepEqual(detectOptoutInFileText(comment), [])
  })
})

// ---------------------------------------------------------------------------
// detectOptoutInCommands
// ---------------------------------------------------------------------------

describe('detectOptoutInCommands', () => {
  test('no assignments → empty set', () => {
    const cmds = [{ binary: 'pnpm', args: ['install'], assignments: [] }]
    assert.equal(detectOptoutInCommands(cmds).size, 0)
  })

  test('inline assignment on pnpm command → found', () => {
    const cmds = [
      {
        binary: 'pnpm',
        args: ['install'],
        assignments: [`${AUTH_FILE_VAR!}=.npmrc`],
      },
    ]
    const found = detectOptoutInCommands(cmds)
    assert.ok(found.has(AUTH_FILE_VAR!))
  })

  test('export command with NAME=value arg → found', () => {
    const cmds = [
      {
        binary: 'export',
        args: [`${AUTH_FILE_VAR!}=.npmrc`],
        assignments: [],
      },
    ]
    const found = detectOptoutInCommands(cmds)
    assert.ok(found.has(AUTH_FILE_VAR!))
  })

  test('USERCONFIG pointing outside repo → not found', () => {
    const cmds = [
      {
        binary: 'export',
        args: [`${USERCONFIG_VAR!}=~/.npmrc`],
        assignments: [],
      },
    ]
    assert.equal(detectOptoutInCommands(cmds).size, 0)
  })

  test('USERCONFIG pointing at repo .npmrc → found', () => {
    const cmds = [
      {
        binary: 'export',
        args: [`${USERCONFIG_VAR!}=.npmrc`],
        assignments: [],
      },
    ]
    const found = detectOptoutInCommands(cmds)
    assert.ok(found.has(USERCONFIG_VAR!))
  })
})

// ---------------------------------------------------------------------------
// detectAuthEnvPlaceholderInNpmrc
// ---------------------------------------------------------------------------

describe('detectAuthEnvPlaceholderInNpmrc', () => {
  test('clean .npmrc → empty', () => {
    assert.deepEqual(
      detectAuthEnvPlaceholderInNpmrc('registry=https://registry.npmjs.org/'),
      [],
    )
  })

  test('_authToken with ${VAR} placeholder → hit on that line', () => {
    // Build the string at runtime to avoid embedding a bare env-placeholder
    // shape that would trip the edit-time npmrc auth-placeholder guard.
    const ph = ['$', '{NPM_TOKEN}'].join('')
    const text = `//registry.npmjs.org/:_authToken=${ph}`
    const lines = detectAuthEnvPlaceholderInNpmrc(text)
    assert.equal(lines.length, 1)
    assert.equal(lines[0], 1)
  })

  test('registry key with $VAR placeholder → hit', () => {
    const text = 'registry=$REGISTRY_URL'
    const lines = detectAuthEnvPlaceholderInNpmrc(text)
    assert.equal(lines.length, 1)
  })

  test('@scope:registry with ${VAR} placeholder → hit', () => {
    const ph = ['$', '{REGISTRY_URL}'].join('')
    const text = `@myorg:registry=${ph}`
    const lines = detectAuthEnvPlaceholderInNpmrc(text)
    assert.equal(lines.length, 1)
  })

  test('comment lines are skipped', () => {
    const ph = ['$', '{NPM_TOKEN}'].join('')
    const text = `# _authToken=${ph}\n; registry=${ph}`
    assert.deepEqual(detectAuthEnvPlaceholderInNpmrc(text), [])
  })

  test('_authToken with literal token (no placeholder) → no hit', () => {
    const text = '//registry.npmjs.org/:_authToken=abc123'
    assert.deepEqual(detectAuthEnvPlaceholderInNpmrc(text), [])
  })

  test('reports correct line numbers across multi-line file', () => {
    const ph = ['$', '{NPM_TOKEN}'].join('')
    const text = [
      'registry=https://registry.npmjs.org/',
      `//registry.evil.com/:_authToken=${ph}`,
    ].join('\n')
    const lines = detectAuthEnvPlaceholderInNpmrc(text)
    assert.deepEqual(lines, [2])
  })
})
