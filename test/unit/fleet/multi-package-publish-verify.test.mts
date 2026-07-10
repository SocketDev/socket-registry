// vitest specs for scripts/fleet/util/multi-package-publish-verify.mts — the
// tag-version extraction, checksums-manifest parsing, and archive/raw-binary
// lookup primitives the cross-org publish stager builds on.

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'
import { afterEach, beforeEach, describe, test } from 'vitest'

import {
  extractVersionFromTag,
  findArchiveForTriplet,
  findRawBinaryForTriplet,
  parseShaSums,
} from '../../../scripts/fleet/util/multi-package-publish-verify.mts'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'multi-package-publish-verify-'))
})

afterEach(async () => {
  await safeDelete(dir, { force: true })
})

describe('extractVersionFromTag', () => {
  test('defaults to the semver scheme (regression: byte-identical to the pre-scheme behavior)', () => {
    assert.equal(
      extractVersionFromTag('acorn-rust-1.2.3', /^acorn-rust-\d+\.\d+\.\d+$/),
      '1.2.3',
    )
    assert.equal(
      extractVersionFromTag(
        'acorn-rust-1.2.3-alpha.0',
        /^acorn-rust-\d+\.\d+\.\d+(?:-\S+)?$/,
      ),
      '1.2.3-alpha.0',
    )
  })

  test('semver scheme rejects a tag that fails the pattern even if it looks version-shaped', () => {
    assert.equal(
      extractVersionFromTag('other-family-1.2.3', /^acorn-rust-\d+\.\d+\.\d+$/),
      undefined,
    )
  })

  test('semver scheme rejects a tag with no semver segment', () => {
    assert.equal(
      extractVersionFromTag('acorn-rust-latest', /^acorn-rust-\S+$/),
      undefined,
    )
  })

  test('date-shortsha scheme maps <yyyymmdd>-<shortsha> to <yyyymmdd>.0.0-<shortsha>', () => {
    assert.equal(
      extractVersionFromTag(
        'binflate-20260507-f1e66a5',
        /^binflate-\d{8}-[0-9a-f]+$/,
        'date-shortsha',
      ),
      '20260507.0.0-f1e66a5',
    )
  })

  test('date-shortsha scheme rejects a malformed tag (no date-shortsha suffix)', () => {
    assert.equal(
      extractVersionFromTag('binflate-1.2.3', /^binflate-.+$/, 'date-shortsha'),
      undefined,
    )
    assert.equal(
      extractVersionFromTag(
        'binflate-2026050-f1e66a5',
        /^binflate-.+$/,
        'date-shortsha',
      ),
      undefined,
    )
  })

  test('date-shortsha scheme rejects a tag that fails the allowlist pattern', () => {
    assert.equal(
      extractVersionFromTag(
        'other-family-20260507-f1e66a5',
        /^binflate-\d{8}-[0-9a-f]+$/,
        'date-shortsha',
      ),
      undefined,
    )
  })
})

describe('parseShaSums', () => {
  test('parses a checksums.txt-shaped manifest identically to a SHA256SUMS-shaped one', () => {
    const sha = 'a'.repeat(64)
    const sums = parseShaSums(`${sha}  binflate-darwin-arm64\n`)
    assert.equal(sums.get('binflate-darwin-arm64'), sha)
  })
})

describe('findArchiveForTriplet', () => {
  test('finds a .tgz archive (regression: unchanged tarball resolution)', () => {
    writeFileSync(path.join(dir, 'acorn-rust-darwin-arm64.tgz'), '')
    assert.equal(
      findArchiveForTriplet(dir, 'acorn-rust-', 'darwin-arm64'),
      'acorn-rust-darwin-arm64.tgz',
    )
  })

  test('finds a .tar.gz archive', () => {
    writeFileSync(path.join(dir, 'acorn-rust-linux-x64.tar.gz'), '')
    assert.equal(
      findArchiveForTriplet(dir, 'acorn-rust-', 'linux-x64'),
      'acorn-rust-linux-x64.tar.gz',
    )
  })

  test('returns undefined when no archive matches', () => {
    assert.equal(
      findArchiveForTriplet(dir, 'acorn-rust-', 'darwin-arm64'),
      undefined,
    )
  })
})

describe('findRawBinaryForTriplet', () => {
  test('finds a raw, extension-less binary for a non-win32 triplet', () => {
    writeFileSync(path.join(dir, 'binflate-darwin-arm64'), '')
    assert.equal(
      findRawBinaryForTriplet(dir, 'binflate', 'darwin-arm64'),
      'binflate-darwin-arm64',
    )
  })

  test('requires the .exe suffix for a win32 triplet', () => {
    writeFileSync(path.join(dir, 'binflate-win32-x64.exe'), '')
    assert.equal(
      findRawBinaryForTriplet(dir, 'binflate', 'win32-x64'),
      'binflate-win32-x64.exe',
    )
    // The extension-less name alone (no .exe) does not satisfy a win32 triplet.
    assert.equal(
      findRawBinaryForTriplet(dir, 'binflate', 'win32-arm64'),
      undefined,
    )
  })

  test('returns undefined when no raw binary matches', () => {
    assert.equal(
      findRawBinaryForTriplet(dir, 'binflate', 'linux-x64'),
      undefined,
    )
  })
})
