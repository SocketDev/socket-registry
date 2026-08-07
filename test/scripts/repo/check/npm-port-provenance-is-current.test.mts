/**
 * @file Tests for the scripts/repo/check/npm-port-provenance-is-current.mts
 *   runner — the exit-code contract over scratch repo roots under os.tmpdir(),
 *   plus the LIVE wiring assertion: this repo's own wired ports must satisfy
 *   the gate. The pure comparison legs are covered by the sibling
 *   npm-port-provenance/{records,problems,currency}.test.mts suites.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'
import { afterEach, describe, expect, test } from 'vitest'

import { runNpmPortProvenanceCheck } from '../../../../scripts/repo/check/npm-port-provenance-is-current.mts'

import {
  GITMODULES_TEXT,
  makeRow,
  PORT_HEADER_SOURCE,
  PORTED_SHA,
  UPSTREAMS,
} from './npm-port-provenance/fixtures.mts'

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
)

interface ScratchRepoOptions {
  // `.gitmodules` contents; omitted means the file is not written at all.
  gitmodules?: string | undefined
  // Lockstep manifest object; defaults to the one wired for-each port.
  manifest?: unknown
}

const scratchRoots: string[] = []

function makeScratchRepo(options?: ScratchRepoOptions | undefined): string {
  const opts = { __proto__: null, ...options } as ScratchRepoOptions
  const root = mkdtempSync(path.join(os.tmpdir(), 'npm-port-provenance-'))
  scratchRoots.push(root)
  mkdirSync(path.join(root, '.config', 'repo'), { recursive: true })
  mkdirSync(path.join(root, 'test', 'npm'), { recursive: true })
  mkdirSync(path.join(root, 'packages', 'npm', 'for-each'), { recursive: true })
  const manifest = opts.manifest ?? {
    area: 'scratch',
    upstreams: UPSTREAMS,
    rows: [makeRow()],
  }
  writeFileSync(
    path.join(root, '.config', 'repo', 'lockstep.json'),
    `${JSON.stringify(manifest, undefined, 2)}\n`,
    'utf8',
  )
  if (opts.gitmodules !== undefined) {
    writeFileSync(path.join(root, '.gitmodules'), opts.gitmodules, 'utf8')
  }
  writeFileSync(
    path.join(root, 'test', 'npm', 'for-each.test.mts'),
    PORT_HEADER_SOURCE,
    'utf8',
  )
  writeFileSync(
    path.join(root, 'test', 'npm', 'package.json'),
    `${JSON.stringify({ devDependencies: { 'for-each': '0.3.5' } }, undefined, 2)}\n`,
    'utf8',
  )
  return root
}

describe('runNpmPortProvenanceCheck', () => {
  afterEach(async () => {
    while (scratchRoots.length) {
      // scratch dirs are removed one at a time so a slow unlink can't race the next test's mkdtemp.
      // oxlint-disable-next-line no-await-in-loop -- scratch dirs are removed
      await safeDelete(scratchRoots.pop()!)
    }
  })

  test('exits 0 on an in-sync scratch repo', async () => {
    const root = makeScratchRepo({ gitmodules: GITMODULES_TEXT })
    await expect(
      runNpmPortProvenanceCheck(root, { quiet: true }),
    ).resolves.toBe(0)
  })

  test('exits 1 when the pinned ref drifted from the port record', async () => {
    const root = makeScratchRepo({
      gitmodules: GITMODULES_TEXT.replace(
        `ref = ${PORTED_SHA}`,
        `ref = ${'e'.repeat(40)}`,
      ),
    })
    await expect(
      runNpmPortProvenanceCheck(root, { quiet: true }),
    ).resolves.toBe(1)
  })

  test('exits 1 when rows are wired but .gitmodules is absent', async () => {
    const root = makeScratchRepo({})
    await expect(
      runNpmPortProvenanceCheck(root, { quiet: true }),
    ).resolves.toBe(1)
  })

  test('exits 0 when no port rows are wired', async () => {
    const root = makeScratchRepo({
      gitmodules: GITMODULES_TEXT,
      manifest: { area: 'scratch', upstreams: {}, rows: [] },
    })
    await expect(
      runNpmPortProvenanceCheck(root, { quiet: true }),
    ).resolves.toBe(0)
  })
})

describe('live wiring', () => {
  test("this repo's wired ports pass the offline gate", async () => {
    await expect(
      runNpmPortProvenanceCheck(REPO_ROOT, { quiet: true }),
    ).resolves.toBe(0)
  })
})
