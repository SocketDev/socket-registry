/**
 * @file Deep-entry smoke test for every npm override: each shipped .js file
 *   must be reachable through the package's exports map by BOTH its
 *   extension-ful specifier and its extensionless form, the way it is against
 *   upstream packages that ship no exports map at all. Resolution runs
 *   through Node itself: every override is symlinked into a scratch
 *   node_modules and probed with require.resolve, so the verdict is the real
 *   resolver's, not a reimplementation's.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  statSync,
  symlinkSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'
import { afterAll, describe, expect, it } from 'vitest'

const NPM_PACKAGES_PATH = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  'packages',
  'npm',
)

const scratch = mkdtempSync(path.join(os.tmpdir(), 'exports-surface-'))
mkdirSync(path.join(scratch, 'node_modules'), { recursive: true })
const scratchRequire = createRequire(path.join(scratch, 'probe.js'))

afterAll(async () => {
  await safeDelete(scratch)
})

function upstreamNameOf(dirName: string): string {
  const match = /^(.+?)__(.+)$/.exec(dirName)
  return match ? `@${match[1]}/${match[2]}` : dirName
}

function linkIntoScratch(pkgDir: string, upstreamName: string): void {
  const linkPath = path.join(scratch, 'node_modules', upstreamName)
  if (existsSync(linkPath)) {
    return
  }
  mkdirSync(path.dirname(linkPath), { recursive: true })
  symlinkSync(pkgDir, linkPath, 'dir')
}

function shippedJsFiles(pkgDir: string, rel = ''): string[] {
  const out: string[] = []
  const entries = readdirSync(path.join(pkgDir, rel))
  for (let i = 0, { length } = entries; i < length; i += 1) {
    const entry = entries[i]!
    if (entry === 'node_modules' || entry.startsWith('.')) {
      continue
    }
    const relPath = rel ? `${rel}/${entry}` : entry
    const stat = statSync(path.join(pkgDir, relPath))
    if (stat.isDirectory()) {
      out.push(...shippedJsFiles(pkgDir, relPath))
    } else if (entry.endsWith('.js')) {
      out.push(relPath)
    }
  }
  return out
}

describe('npm > exports surface', () => {
  const pkgNames = readdirSync(NPM_PACKAGES_PATH).toSorted()

  for (let i = 0, { length } = pkgNames; i < length; i += 1) {
    const pkgName = pkgNames[i]!
    const pkgDir = path.join(NPM_PACKAGES_PATH, pkgName)
    if (!existsSync(path.join(pkgDir, 'package.json'))) {
      continue
    }
    const upstreamName = upstreamNameOf(pkgName)

    it(`${pkgName}: every shipped .js resolves with and without extension`, () => {
      linkIntoScratch(pkgDir, upstreamName)
      for (const file of shippedJsFiles(pkgDir)) {
        expect(
          () => scratchRequire.resolve(`${upstreamName}/${file}`),
          `${upstreamName}/${file} does not resolve`,
        ).not.toThrow()
        expect(
          () => scratchRequire.resolve(`${upstreamName}/${file.slice(0, -3)}`),
          `${upstreamName}/${file.slice(0, -3)} does not resolve`,
        ).not.toThrow()
      }
    })
  }
})
