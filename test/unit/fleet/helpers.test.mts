import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'

import { test } from 'vitest'

import {
  beginMarker,
  computeSha256,
  endMarker,
  mergeWorkspaceYaml,
  spliceFleetBlock,
  verifyBundleFiles,
  verifySegments,
} from '../../../bootstrap/src/helpers.mts'
import type {
  BundleManifest,
  MergeWorkspaceOptions,
} from '../../../bootstrap/src/helpers.mts'
import { safeDeleteSync } from '@socketsecurity/lib-stable/fs/safe'

// ── computeSha256 ─────────────────────────────────────────────────────────────

test('computeSha256 produces a 64-char hex string for non-empty input', () => {
  const digest = computeSha256(Buffer.from('hello'))
  assert.equal(typeof digest, 'string')
  assert.equal(digest.length, 64)
  assert.match(digest, /^[0-9a-f]{64}$/)
})

test('computeSha256 is deterministic', () => {
  const a = computeSha256(Buffer.from('socket'))
  const b = computeSha256(Buffer.from('socket'))
  assert.equal(a, b)
})

test('computeSha256 differs for different inputs', () => {
  assert.notEqual(
    computeSha256(Buffer.from('a')),
    computeSha256(Buffer.from('b')),
  )
})

// ── beginMarker / endMarker ───────────────────────────────────────────────────

test('beginMarker html emits bare-tag form', () => {
  assert.equal(beginMarker('html'), '<!-- <fleet-canonical> -->')
})

test('endMarker html emits bare-tag form', () => {
  assert.equal(endMarker('html'), '<!-- </fleet-canonical> -->')
})

test('beginMarker hash emits bare-tag form', () => {
  assert.equal(beginMarker('hash'), '# <fleet-canonical>')
})

test('endMarker hash emits bare-tag form', () => {
  assert.equal(endMarker('hash'), '# </fleet-canonical>')
})

test('beginMarker slash emits bare-tag form', () => {
  assert.equal(beginMarker('slash'), '// <fleet-canonical>')
})

// ── spliceFleetBlock — existing html markers ───────────────────────────────────

const HTML_BEGIN = beginMarker('html')
const HTML_END = endMarker('html')

const FLEET_BLOCK_HTML = [HTML_BEGIN, '## Fleet', '- rule A', HTML_END].join(
  '\n',
)

test('spliceFleetBlock html: replaces existing block byte-exactly', () => {
  const original = [
    '# CLAUDE.md',
    '',
    HTML_BEGIN,
    '## Fleet',
    '- old rule',
    HTML_END,
    '',
    '## Project',
    '- custom content',
  ].join('\n')

  const result = spliceFleetBlock({
    commentStyle: 'html',
    fleetBlock: FLEET_BLOCK_HTML,
    target: original,
  })

  const lines = result.split('\n')
  assert.equal(lines[0], '# CLAUDE.md')
  assert.ok(result.includes('- rule A'), 'new fleet rule present')
  assert.ok(!result.includes('- old rule'), 'old fleet rule removed')
  assert.ok(result.includes('## Project'), 'project content preserved')
})

test('spliceFleetBlock html: markers are inclusive in replacement', () => {
  const original = ['# Title', HTML_BEGIN, '- stale', HTML_END, 'after'].join(
    '\n',
  )
  const result = spliceFleetBlock({
    commentStyle: 'html',
    fleetBlock: FLEET_BLOCK_HTML,
    target: original,
  })
  assert.ok(result.startsWith('# Title\n'))
  assert.ok(result.includes(HTML_BEGIN))
  assert.ok(result.includes(HTML_END))
  assert.ok(!result.includes('- stale'))
  assert.ok(result.includes('after'))
})

// ── spliceFleetBlock — insert-when-absent (html) ───────────────────────────────

test('spliceFleetBlock html: inserts before first H2 when no markers', () => {
  const original = ['# My Repo CLAUDE.md', '', '## Setup', '- step 1'].join(
    '\n',
  )
  const result = spliceFleetBlock({
    commentStyle: 'html',
    fleetBlock: FLEET_BLOCK_HTML,
    target: original,
  })
  const lines = result.split('\n')
  const fleetBeginIdx = lines.findIndex(l => l === HTML_BEGIN)
  const h2Idx = lines.findIndex(l => l === '## Setup')
  assert.ok(fleetBeginIdx !== -1, 'fleet block inserted')
  assert.ok(fleetBeginIdx < h2Idx, 'fleet block before ## Setup')
  assert.ok(result.includes('# My Repo CLAUDE.md'))
  assert.ok(result.includes('## Setup'))
})

test('spliceFleetBlock html: appends at end when no H2 and no markers', () => {
  const original = '# Title\n\nSome prose.'
  const result = spliceFleetBlock({
    commentStyle: 'html',
    fleetBlock: FLEET_BLOCK_HTML,
    target: original,
  })
  assert.ok(result.startsWith('# Title\n'))
  assert.ok(result.includes(HTML_BEGIN))
  assert.ok(result.endsWith(HTML_END + '\n') || result.includes(HTML_END))
})

// ── spliceFleetBlock — hash style (.gitignore) ────────────────────────────────

const HASH_BEGIN = beginMarker('hash')
const HASH_END = endMarker('hash')

const FLEET_BLOCK_HASH = [HASH_BEGIN, 'node_modules/', HASH_END].join('\n')

test('spliceFleetBlock hash: replaces existing block', () => {
  const original = [
    '# My ignores',
    HASH_BEGIN,
    'old-entry/',
    HASH_END,
    'dist/',
  ].join('\n')
  const result = spliceFleetBlock({
    commentStyle: 'hash',
    fleetBlock: FLEET_BLOCK_HASH,
    target: original,
  })
  assert.ok(result.includes('# My ignores'))
  assert.ok(result.includes('node_modules/'))
  assert.ok(!result.includes('old-entry/'))
  assert.ok(result.includes('dist/'))
})

test('spliceFleetBlock hash: appends with blank line when no markers', () => {
  const original = '# project ignores\ndist/'
  const result = spliceFleetBlock({
    commentStyle: 'hash',
    fleetBlock: FLEET_BLOCK_HASH,
    target: original,
  })
  assert.ok(result.startsWith('# project ignores\ndist/'))
  assert.ok(result.includes('\n\n' + HASH_BEGIN))
  assert.ok(result.includes('node_modules/'))
})

test('spliceFleetBlock html: replaces legacy BEGIN/END markers (backward-compat)', () => {
  const legacyBegin = '<!-- BEGIN <fleet-canonical> -->'
  const legacyEnd = '<!-- END </fleet-canonical> -->'
  const original = [
    '# CLAUDE.md',
    '',
    legacyBegin,
    '## Fleet',
    '- old rule',
    legacyEnd,
    '',
    '## Project',
    '- custom',
  ].join('\n')
  const result = spliceFleetBlock({
    commentStyle: 'html',
    fleetBlock: FLEET_BLOCK_HTML,
    target: original,
  })
  assert.ok(!result.includes(legacyBegin), 'legacy open marker removed')
  assert.ok(!result.includes(legacyEnd), 'legacy close marker removed')
  assert.ok(result.includes(HTML_BEGIN), 'bare-tag open marker present')
  assert.ok(result.includes(HTML_END), 'bare-tag close marker present')
  assert.ok(!result.includes('- old rule'), 'old fleet rule removed')
  assert.ok(result.includes('- rule A'), 'new fleet rule present')
  assert.ok(result.includes('## Project'), 'project content preserved')
})

test('spliceFleetBlock hash: replaces legacy BEGIN/END markers (backward-compat)', () => {
  const legacyBegin = '# BEGIN <fleet-canonical>'
  const legacyEnd = '# END </fleet-canonical>'
  const original = [
    '# My ignores',
    legacyBegin,
    'old-entry/',
    legacyEnd,
    'dist/',
  ].join('\n')
  const result = spliceFleetBlock({
    commentStyle: 'hash',
    fleetBlock: FLEET_BLOCK_HASH,
    target: original,
  })
  assert.ok(!result.includes(legacyBegin), 'legacy open marker removed')
  assert.ok(!result.includes(legacyEnd), 'legacy close marker removed')
  assert.ok(result.includes(HASH_BEGIN), 'bare-tag open marker present')
  assert.ok(result.includes(HASH_END), 'bare-tag close marker present')
  assert.ok(!result.includes('old-entry/'), 'old fleet content removed')
  assert.ok(result.includes('node_modules/'), 'new fleet content present')
  assert.ok(result.includes('dist/'), 'project content preserved')
})

// ── verifyBundleFiles ─────────────────────────────────────────────────────────

test('verifyBundleFiles: passes when all files present and match', () => {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-verify-'))
  try {
    const content = Buffer.from('hello world')
    fs.writeFileSync(path.join(tmp, 'file.txt'), content)
    const manifest: BundleManifest = {
      files: { 'file.txt': computeSha256(content) },
      templateSha: 'abc',
      version: '1.0',
    }
    const problems = verifyBundleFiles(tmp, manifest)
    assert.deepEqual(problems, [])
  } finally {
    safeDeleteSync(tmp)
  }
})

test('verifyBundleFiles: reports missing file', () => {
  const manifest: BundleManifest = {
    files: { 'missing.txt': 'deadbeef' },
    templateSha: 'abc',
    version: '1.0',
  }
  const problems = verifyBundleFiles('/nonexistent-dir', manifest)
  assert.ok(problems.some(p => p.includes('missing')))
})

test('verifyBundleFiles: reports sha256 mismatch', () => {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-mismatch-'))
  try {
    fs.writeFileSync(path.join(tmp, 'f.txt'), 'actual content')
    const manifest: BundleManifest = {
      files: { 'f.txt': 'wronghash' },
      templateSha: 'abc',
      version: '1.0',
    }
    const problems = verifyBundleFiles(tmp, manifest)
    assert.ok(problems.some(p => p.includes('mismatch')))
  } finally {
    safeDeleteSync(tmp)
  }
})

// ── verifySegments ────────────────────────────────────────────────────────────

test('verifySegments: empty when manifest has no segments', () => {
  const manifest: BundleManifest = {
    files: {},
    templateSha: 'abc',
    version: '1.0',
  }
  const problems = verifySegments('/unused', manifest)
  assert.deepEqual(problems, [])
})

test('verifySegments: reports missing segment file', () => {
  const manifest: BundleManifest = {
    files: {},
    segments: [{ commentStyle: 'html', path: 'CLAUDE.md', sha256: 'abc' }],
    templateSha: 'abc',
    version: '1.0',
  }
  const problems = verifySegments('/nonexistent-dir', manifest)
  assert.ok(problems.some(p => p.includes('missing')))
})

test('verifySegments: passes when segment matches', () => {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-seg-'))
  try {
    const block = Buffer.from(
      '<!-- <fleet-canonical> -->\n## Fleet\n<!-- </fleet-canonical> -->',
    )
    fs.writeFileSync(path.join(tmp, 'CLAUDE.md.fleetblock'), block)
    const manifest: BundleManifest = {
      files: {},
      segments: [
        {
          commentStyle: 'html',
          path: 'CLAUDE.md',
          sha256: computeSha256(block),
        },
      ],
      templateSha: 'abc',
      version: '1.0',
    }
    const problems = verifySegments(tmp, manifest)
    assert.deepEqual(problems, [])
  } finally {
    safeDeleteSync(tmp)
  }
})

// ── mergeWorkspaceYaml ────────────────────────────────────────────────────────

test('mergeWorkspaceYaml: fleet scalar replaced + packages: preserved byte-exact', () => {
  const consumerYaml = [
    'packages:',
    '  - packages/*',
    'minimumReleaseAge: 5000',
  ].join('\n')

  const bundleFleetSections = 'minimumReleaseAge: 10080\n'

  const options: MergeWorkspaceOptions = {
    bundleFleetSections,
    consumerYaml,
    fleetKeys: ['minimumReleaseAge'],
  }
  const result = mergeWorkspaceYaml(options)

  assert.ok(result.includes('10080'), 'fleet scalar replaced with bundle value')
  assert.ok(!result.includes('5000'), 'old value removed')
  assert.ok(result.includes('packages:'), 'packages: key preserved')
  assert.ok(
    result.includes('  - packages/*'),
    'packages: content preserved byte-exact',
  )
})

test('mergeWorkspaceYaml: fleet catalog/overrides block replaced', () => {
  const consumerYaml = [
    'packages:',
    '  - packages/*',
    'overrides:',
    '  old-pkg: 1.0.0',
    '  another: 2.0.0',
  ].join('\n')

  const bundleFleetSections = [
    'overrides:',
    '  new-pkg: 3.0.0',
    '  updated: 4.0.0',
  ].join('\n')

  const options: MergeWorkspaceOptions = {
    bundleFleetSections,
    consumerYaml,
    fleetKeys: ['overrides'],
  }
  const result = mergeWorkspaceYaml(options)

  assert.ok(result.includes('new-pkg: 3.0.0'), 'new overrides present')
  assert.ok(result.includes('updated: 4.0.0'), 'new overrides present')
  assert.ok(!result.includes('old-pkg'), 'old overrides removed')
  assert.ok(!result.includes('another'), 'old overrides removed')
  assert.ok(result.includes('packages:'), 'packages: preserved')
})

test('mergeWorkspaceYaml: throws on ambiguous input (duplicate fleet key)', () => {
  const consumerYaml = [
    'packages:',
    '  - packages/*',
    'minimumReleaseAge: 5000',
    'minimumReleaseAge: 9000',
  ].join('\n')

  const bundleFleetSections = 'minimumReleaseAge: 10080\n'

  const options: MergeWorkspaceOptions = {
    bundleFleetSections,
    consumerYaml,
    fleetKeys: ['minimumReleaseAge'],
  }
  assert.throws(
    () => mergeWorkspaceYaml(options),
    (err: unknown) => {
      assert.ok(err instanceof Error)
      assert.ok(
        err.message.includes('minimumReleaseAge'),
        'error names the duplicate key',
      )
      return true
    },
  )
})
