// vitest specs for headroom-pin-is-consistent — the pure extractors + the
// version-agreement predicate that keep the headroom-ai pin in lockstep across
// external-tools.json, pyproject.toml, and uv.lock. The filesystem
// orchestration (main) is covered by the check running in `check --all`.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  readExternalToolsVersion,
  readLockVersion,
  readPyprojectVersion,
  versionAgrees,
} from '../../../scripts/fleet/check/headroom-pin-is-consistent.mts'

describe('headroom-pin-is-consistent — versionAgrees', () => {
  test('identical versions agree', () => {
    assert.equal(versionAgrees('0.24.0', '0.24.0'), true)
    assert.equal(versionAgrees(' 0.24.0 ', '0.24.0'), true)
  })
  test('different versions do not agree', () => {
    assert.equal(versionAgrees('0.24.0', '0.25.0'), false)
    // unlike a SHA prefix-match, a prefix is NOT a match for versions
    assert.equal(versionAgrees('0.24.0', '0.24'), false)
  })
  test('empty inputs do not agree', () => {
    assert.equal(versionAgrees('', '0.24.0'), false)
    assert.equal(versionAgrees('0.24.0', ''), false)
  })
})

describe('headroom-pin-is-consistent — readExternalToolsVersion', () => {
  test('extracts tools.headroom.version', () => {
    assert.equal(
      readExternalToolsVersion('{"tools":{"headroom":{"version":"0.24.0"}}}'),
      '0.24.0',
    )
  })
  test('absent → undefined', () => {
    assert.equal(readExternalToolsVersion('{"tools":{}}'), undefined)
    assert.equal(readExternalToolsVersion('not json'), undefined)
  })
})

describe('headroom-pin-is-consistent — readPyprojectVersion', () => {
  test('extracts the ==<version> pin (with extra)', () => {
    assert.equal(
      readPyprojectVersion('dependencies = ["headroom-ai[proxy]==0.24.0"]'),
      '0.24.0',
    )
  })
  test('extracts the pin without an extra', () => {
    assert.equal(
      readPyprojectVersion('dependencies = ["headroom-ai==1.2.3"]'),
      '1.2.3',
    )
  })
  test('no pin → undefined', () => {
    assert.equal(
      readPyprojectVersion('dependencies = ["headroom-ai[proxy]"]'),
      undefined,
    )
  })
})

describe('headroom-pin-is-consistent — readLockVersion', () => {
  const LOCK = [
    '[[package]]',
    'name = "click"',
    'version = "8.1.0"',
    '',
    '[[package]]',
    'name = "headroom-ai"',
    'version = "0.24.0"',
    'source = { registry = "https://pypi.org/simple" }',
  ].join('\n')

  test('extracts the headroom-ai block version (not a sibling package)', () => {
    assert.equal(readLockVersion(LOCK), '0.24.0')
  })
  test('absent → undefined', () => {
    assert.equal(
      readLockVersion('[[package]]\nname = "click"\nversion = "8.1.0"'),
      undefined,
    )
  })
})
