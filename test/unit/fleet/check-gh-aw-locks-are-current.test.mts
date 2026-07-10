// vitest spec for check-gh-aw-locks-are-current. The two exported pure
// functions (bodyHashOf + embeddedBodyHash) are exercised with inline
// string fixtures — no repo, no network, no git. The module-level side
// effects (git ls-files + process.exitCode) run in the isolated vitest
// context and do not affect test assertions.

import assert from 'node:assert/strict'
import crypto from 'node:crypto'

import { describe, test } from 'vitest'

import {
  bodyHashOf,
  embeddedBodyHash,
} from '../../../scripts/fleet/check/gh-aw-locks-are-current.mts'

// Helper to produce a sha256 hex the same way bodyHashOf does.
function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex')
}

// A minimal gh-aw-style markdown with frontmatter, matching the split logic
// in bodyHashOf: sections split on /^---\s*$/m, [0]=pre, [1]=front, [2+]=body.
function makeMd(frontmatter: string, body: string): string {
  return `---\n${frontmatter}\n---\n${body}`
}

// Build a lock.yml snippet that gh-aw would embed.
function makeLock(bodyHash: string): string {
  return `# gh-aw-metadata: {"body_hash":"${bodyHash}","version":"1"}\njobs:\n  run:\n    steps: []\n`
}

describe('bodyHashOf', () => {
  test('returns sha256 of the trimmed body after the closing frontmatter ---', () => {
    const body = 'Run the thing and check the result.\n'
    const md = makeMd('name: test\ndescription: x', body)
    const expected = sha256(body.trim())
    assert.equal(bodyHashOf(md), expected)
  })

  test('trims surrounding whitespace from the body before hashing', () => {
    const body = '  \n  do something  \n  '
    const md = makeMd('name: x', body)
    const expected = sha256(body.trim())
    assert.equal(bodyHashOf(md), expected)
  })

  test('a --- inside the body is faithfully rejoined and included in the hash', () => {
    // Splits produce [pre='', front='name: x', '---', 'after']; body = '---\nafter'
    const md = `---\nname: x\n---\nbefore\n---\nafter\n`
    // parts = ['', 'name: x', '\nbefore\n', '\nafter\n']
    // body = parts.slice(2).join('---') = '\nbefore\n---\nafter\n'
    const parts = md.split(/^---\s*$/mu)
    const body = parts.slice(2).join('---')
    const expected = sha256(body.trim())
    assert.equal(bodyHashOf(md), expected)
  })

  test('two different bodies produce different hashes', () => {
    const md1 = makeMd('name: a', 'Step A.\n')
    const md2 = makeMd('name: a', 'Step B.\n')
    assert.notEqual(bodyHashOf(md1), bodyHashOf(md2))
  })

  test('hash is stable (same input = same output)', () => {
    const md = makeMd('name: stable', 'Do the thing.\n')
    assert.equal(bodyHashOf(md), bodyHashOf(md))
  })
})

describe('embeddedBodyHash', () => {
  test('extracts the body_hash from a well-formed gh-aw-metadata header', () => {
    const hash = 'a'.repeat(64)
    const lock = makeLock(hash)
    assert.equal(embeddedBodyHash(lock), hash)
  })

  test('returns undefined when no body_hash field is present', () => {
    assert.equal(embeddedBodyHash('# plain comment\njobs: {}'), undefined)
  })

  test('returns undefined for an empty string', () => {
    assert.equal(embeddedBodyHash(''), undefined)
  })

  test('returns undefined for a hand-edited lock with no metadata header', () => {
    const handEdited = `on:\n  workflow_dispatch:\njobs:\n  run:\n    runs-on: ubuntu-latest\n`
    assert.equal(embeddedBodyHash(handEdited), undefined)
  })

  test('returns only the hex value, not surrounding quotes or keys', () => {
    const hash = 'deadbeef'.repeat(8)
    const result = embeddedBodyHash(makeLock(hash))
    assert.equal(result, hash)
    assert.match(result!, /^[0-9a-f]+$/u)
  })
})

describe('bodyHashOf + embeddedBodyHash round-trip', () => {
  test('PASS: hash computed from .md matches the embedded hash in .lock.yml', () => {
    const body = 'Search GitHub for stale branches and report them.\n'
    const md = makeMd(
      'name: stale-branches\ndescription: finds stale branches',
      body,
    )
    const hash = bodyHashOf(md)
    const lock = makeLock(hash)
    const embedded = embeddedBodyHash(lock)
    assert.equal(embedded, hash, 'embedded hash should match computed hash')
  })

  test('FAIL: body edited after compile → embedded hash diverges from recomputed hash', () => {
    const originalBody = 'Search GitHub for stale branches and report them.\n'
    const md = makeMd(
      'name: stale-branches\ndescription: finds stale branches',
      originalBody,
    )
    const hash = bodyHashOf(md)
    const lock = makeLock(hash)

    // Simulate editing the .md body without re-running gh aw compile.
    const editedBody =
      'Search GitHub for stale branches and report them. Also ping Slack.\n'
    const editedMd = makeMd(
      'name: stale-branches\ndescription: finds stale branches',
      editedBody,
    )
    const recomputed = bodyHashOf(editedMd)
    const embedded = embeddedBodyHash(lock)

    assert.notEqual(
      recomputed,
      embedded,
      'edited body should diverge from the stale lock hash',
    )
  })

  test('FAIL: missing lock detected because embeddedBodyHash returns undefined', () => {
    // A lock that was never compiled has no metadata header.
    const uncompiled = ''
    assert.equal(
      embeddedBodyHash(uncompiled),
      undefined,
      'no lock file content → no embedded hash → detectable as missing/uncompiled',
    )
  })
})
