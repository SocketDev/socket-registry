/**
 * @file Unit tests for the surface-coverage gate's pure legs on synthetic
 *   data: the ustar tarball lister, the legal-subpath union builder with its
 *   test-file exclusions and exports-map branch, and gap detection against a
 *   scratch override dir. The network legs run only under --online in the
 *   weekly job; the offline default's explicit skip is asserted here too.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'
import { afterAll, describe, expect, it } from 'vitest'

import {
  findSurfaceGaps,
  legalSubpathsFor,
  listTarballFiles,
  runSurfaceCheck,
} from '../../../../scripts/repo/check/override-surface-covers-upstream-majors.mts'

const scratchDirs: string[] = []

afterAll(async () => {
  for (let i = 0, { length } = scratchDirs; i < length; i += 1) {
    await safeDelete(scratchDirs[i]!)
  }
})

function tarEntry(name: string, content: string): Buffer {
  const header = Buffer.alloc(512)
  header.write(name, 0, 'utf8')
  header.write('0000644\0', 100, 'utf8')
  header.write(`${content.length.toString(8).padStart(11, '0')}\0`, 124, 'utf8')
  header.write('0', 156, 'utf8')
  const body = Buffer.alloc(Math.ceil(content.length / 512) * 512)
  body.write(content, 0, 'utf8')
  return Buffer.concat([header, body])
}

function makeTarball(names: readonly string[]): Buffer {
  const parts = names.map(n => tarEntry(n, '// x\n'))
  parts.push(Buffer.alloc(1024))
  return gzipSync(Buffer.concat(parts))
}

describe('scripts/repo/check/override-surface-covers-upstream-majors', () => {
  it('lists regular files from a registry-style tarball', () => {
    const tarball = makeTarball([
      'package/index.js',
      'package/helpers/deep.js',
      'package/README.md',
    ])
    expect(listTarballFiles(tarball)).toEqual([
      'index.js',
      'helpers/deep.js',
      'README.md',
    ])
  })

  it('builds the two-form union for map-less upstreams, excluding test files', () => {
    const subpaths = legalSubpathsFor(
      ['index.js', 'polyfill.js', 'test.js', 'test/run.js', 'README.md'],
      undefined,
    )
    expect(subpaths.toSorted()).toEqual([
      '.',
      './index',
      './index.js',
      './polyfill',
      './polyfill.js',
    ])
  })

  it('uses literal exports keys when the upstream ships a map', () => {
    expect(
      legalSubpathsFor(['index.js', 'extra.js'], {
        '.': './index.js',
        './polyfill': './polyfill.js',
        './*': './*.js',
      }).toSorted(),
    ).toEqual(['.', './polyfill'])
  })

  it('flags unresolvable and missing-target subpaths against an override', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'surface-check-'))
    scratchDirs.push(dir)
    mkdirSync(path.join(dir, 'sub'), { recursive: true })
    writeFileSync(path.join(dir, 'index.js'), '// x\n')
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        exports: {
          '.': './index.js',
          './ghost': './ghost.js',
        },
      }),
    )
    const gaps = findSurfaceGaps(dir, 'fixture', 1, '1.0.0', [
      '.',
      './ghost',
      './unmapped',
    ])
    expect(gaps).toHaveLength(2)
    expect(gaps[0]).toMatchObject({
      reason: 'resolves to missing ./ghost.js',
      subpath: './ghost',
    })
    expect(gaps[1]).toMatchObject({
      reason: 'not resolvable through the override exports map',
      subpath: './unmapped',
    })
  })

  it('offline default is an explicit skip that passes without measuring', async () => {
    expect(await runSurfaceCheck({ quiet: true })).toBe(0)
  })
})
