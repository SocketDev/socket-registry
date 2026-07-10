// Unit tests for the fleet link:-protocol gate
// (scripts/fleet/check/package-deps-have-no-link-protocol.mts).
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  checkPackageJson,
  findPackageJsonFiles,
} from '../../../scripts/fleet/check/package-deps-have-no-link-protocol.mts'

function writePkg(dir: string, pkg: unknown): string {
  const file = path.join(dir, 'package.json')
  writeFileSync(file, JSON.stringify(pkg))
  return file
}

describe('checkPackageJson', () => {
  it('flags link: deps across every dependency field', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'fleet-link-'))
    const file = writePkg(dir, {
      dependencies: { a: 'link:../a' },
      devDependencies: { b: '^1.0.0' },
      peerDependencies: { c: 'link:/abs/c' },
    })
    const violations = await checkPackageJson(file)
    expect(violations.map(v => v.package).toSorted()).toStrictEqual(['a', 'c'])
  })

  it('allows workspace: / catalog: / semver specs', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'fleet-link-ok-'))
    const file = writePkg(dir, {
      dependencies: { a: 'workspace:*', b: 'catalog:', c: '^2.0.0' },
    })
    expect(await checkPackageJson(file)).toStrictEqual([])
  })
})

describe('findPackageJsonFiles', () => {
  it('skips node_modules / dist / build / .git', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'fleet-link-walk-'))
    const rootPkg = writePkg(dir, {})
    mkdirSync(path.join(dir, 'node_modules'))
    writeFileSync(path.join(dir, 'node_modules', 'package.json'), '{}')
    expect(await findPackageJsonFiles(dir)).toStrictEqual([rootPkg])
  })
})
