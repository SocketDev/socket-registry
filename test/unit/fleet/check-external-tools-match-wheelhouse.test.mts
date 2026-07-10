// Unit tests for the external-tools drift gate's pure halves: tools-container
// parsing, shared-entry diffing, and reference-copy resolution over temp dirs.

import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, test } from 'vitest'

import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'

import {
  driftedSharedTools,
  findReferenceCopy,
  parseTools,
} from '../../../scripts/fleet/check/external-tools-match-wheelhouse.mts'

describe('parseTools', () => {
  test('returns the tools map from the container format', () => {
    const tools = parseTools(
      JSON.stringify({ tools: { sfw: { version: '1.12.0' } } }),
    )
    assert.deepEqual(tools, { sfw: { version: '1.12.0' } })
  })

  test('returns undefined for a pre-container-format copy', () => {
    assert.equal(parseTools(JSON.stringify({ sfw: { version: '1.7.2' } })), undefined)
  })

  test('returns undefined for unparseable content', () => {
    assert.equal(parseTools('not json {{{'), undefined)
  })
})

describe('driftedSharedTools', () => {
  const wheelhouse = {
    pnpm: { version: '11.8.0' },
    'sfw-free': { binaryName: 'sfw', version: '1.12.0' },
    zizmor: { version: '1.25.2' },
  }

  test('flags a shared entry whose value differs', () => {
    const member = {
      pnpm: { version: '11.0.0' },
      'sfw-free': { binaryName: 'sfw', version: '1.12.0' },
      zizmor: { version: '1.25.2' },
    }
    assert.deepEqual(driftedSharedTools(member, wheelhouse), ['pnpm'])
  })

  test('passes when every shared entry matches', () => {
    assert.deepEqual(driftedSharedTools({ ...wheelhouse }, wheelhouse), [])
  })

  test('ignores repo-specific tools absent from the wheelhouse copy', () => {
    const member = {
      ...wheelhouse,
      'go-toolchain': { version: '1.23.0' },
    }
    assert.deepEqual(driftedSharedTools(member, wheelhouse), [])
  })

  test('a wheelhouse-only tool the member lacks is not drift', () => {
    const member = { pnpm: { version: '11.8.0' } }
    assert.deepEqual(driftedSharedTools(member, wheelhouse), [])
  })

  test('flags the missing-binaryName shape that broke five repos', () => {
    const member = {
      ...wheelhouse,
      'sfw-free': { version: '1.7.2' },
    }
    assert.deepEqual(driftedSharedTools(member, wheelhouse), ['sfw-free'])
  })
})

describe('findReferenceCopy', () => {
  const tmpDirs: string[] = []

  function tmpDir(): string {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'et-drift-'))
    tmpDirs.push(dir)
    return dir
  }

  afterEach(async () => {
    for (const dir of tmpDirs.splice(0)) {
      await safeDelete(dir)
    }
  })

  test('resolves the repo itself when it is the wheelhouse', () => {
    const root = tmpDir()
    mkdirSync(path.join(root, 'template', 'base'), { recursive: true })
    writeFileSync(path.join(root, 'external-tools.json'), '{"tools":{}}')
    assert.equal(
      findReferenceCopy(root),
      path.join(root, 'external-tools.json'),
    )
  })

  test('resolves a socket-wheelhouse sibling checkout', () => {
    const parent = tmpDir()
    const member = path.join(parent, 'member-repo')
    const wheelhouse = path.join(parent, 'socket-wheelhouse')
    mkdirSync(member, { recursive: true })
    mkdirSync(wheelhouse, { recursive: true })
    writeFileSync(path.join(wheelhouse, 'external-tools.json'), '{"tools":{}}')
    assert.equal(
      findReferenceCopy(member),
      path.join(wheelhouse, 'external-tools.json'),
    )
  })

  test('returns undefined with no reference copy findable (CI)', () => {
    const parent = tmpDir()
    const member = path.join(parent, 'member-repo')
    mkdirSync(member, { recursive: true })
    assert.equal(findReferenceCopy(member), undefined)
  })
})
