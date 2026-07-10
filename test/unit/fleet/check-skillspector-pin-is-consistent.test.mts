// vitest specs for skillspector-pin-is-consistent — the pure extractors + the
// SHA-agreement predicate that keep the SkillSpector pin in lockstep across
// external-tools.json, pyproject.toml, and uv.lock. The filesystem
// orchestration (main) is covered by the check running in `check --all`.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  readExternalToolsSha,
  readLockSha,
  readPyprojectRev,
  shaAgrees,
} from '../../../scripts/fleet/check/skillspector-pin-is-consistent.mts'

const FULL = '2eb844780ab163f01468ecf142c40a2ec0fcaec0'
const SHORT = '2eb84478'

describe('skillspector-pin-is-consistent — shaAgrees', () => {
  test('short SHA is a prefix of the full SHA → agrees', () => {
    assert.equal(shaAgrees(SHORT, FULL), true)
    assert.equal(shaAgrees(FULL, SHORT), true)
  })

  test('identical SHAs agree', () => {
    assert.equal(shaAgrees(SHORT, SHORT), true)
    assert.equal(shaAgrees(FULL, FULL), true)
  })

  test('is case-insensitive', () => {
    assert.equal(shaAgrees(SHORT.toUpperCase(), FULL), true)
  })

  test('a different SHA does not agree', () => {
    assert.equal(shaAgrees(SHORT, 'deadbeef'), false)
    assert.equal(shaAgrees('abc1234', FULL), false)
  })

  test('empty operands never agree', () => {
    assert.equal(shaAgrees('', FULL), false)
    assert.equal(shaAgrees(SHORT, ''), false)
  })
})

describe('skillspector-pin-is-consistent — readExternalToolsSha', () => {
  test('pulls tools.skillspector.version', () => {
    const text = JSON.stringify({ tools: { skillspector: { version: SHORT } } })
    assert.equal(readExternalToolsSha(text), SHORT)
  })

  test('undefined when absent', () => {
    assert.equal(readExternalToolsSha(JSON.stringify({ tools: {} })), undefined)
  })

  test('undefined on malformed JSON (never throws)', () => {
    assert.equal(readExternalToolsSha('{ broken'), undefined)
  })
})

describe('skillspector-pin-is-consistent — readPyprojectRev', () => {
  test('pulls the rev from the skillspector git source line', () => {
    const text = [
      '[tool.uv.sources]',
      `skillspector = { git = "https://github.com/NVIDIA/skillspector.git", rev = "${SHORT}" }`,
    ].join('\n')
    assert.equal(readPyprojectRev(text), SHORT)
  })

  test('undefined when no skillspector rev line exists', () => {
    assert.equal(readPyprojectRev('[project]\nname = "x"\n'), undefined)
  })
})

describe('skillspector-pin-is-consistent — readLockSha', () => {
  test('pulls the full SHA after `#` in the skillspector package source', () => {
    const text = [
      '[[package]]',
      'name = "httpx"',
      'version = "0.27.0"',
      '',
      '[[package]]',
      'name = "skillspector"',
      'version = "2.0.0"',
      `source = { git = "https://github.com/NVIDIA/skillspector.git?rev=${SHORT}#${FULL}" }`,
    ].join('\n')
    assert.equal(readLockSha(text), FULL)
  })

  test('undefined when skillspector has no git source', () => {
    const text = '[[package]]\nname = "other"\nversion = "1.0.0"\n'
    assert.equal(readLockSha(text), undefined)
  })

  test('does not read a SHA from a DIFFERENT package block', () => {
    // A git source on a sibling package must not be misattributed to
    // skillspector (the scan stops at the next [[package]] boundary).
    const text = [
      '[[package]]',
      'name = "skillspector"',
      'version = "2.0.0"',
      '',
      '[[package]]',
      'name = "sibling"',
      `source = { git = "https://example.com/x.git?rev=aaaa#${FULL}" }`,
    ].join('\n')
    assert.equal(readLockSha(text), undefined)
  })
})
