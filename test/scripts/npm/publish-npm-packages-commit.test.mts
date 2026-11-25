/**
 * @file Tests for scripts/npm/publish-npm-packages-commit.mts. The
 *   publish-registry-last and --force-registry branches key off the registry
 *   package's identity; a hardcoded '@socketsecurity/registry-stable' literal
 *   never matched registry/package.json's actual name, so both branches were
 *   dead. The name is derived from the manifest now, and these specs pin both
 *   the derivation and the absence of the stale literal.
 */

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { safeDeleteSync } from '@socketsecurity/lib-stable/fs/safe'
import { describe, expect, test } from 'vitest'

import {
  REGISTRY_PKG_PATH,
  ROOT_PATH,
} from '../../../scripts/constants/paths.mts'
import {
  packageData,
  requirePackageJson,
} from '../../../scripts/npm/publish-npm-packages-commit.mts'

const COMMIT_MODULE_PATH = path.join(
  ROOT_PATH,
  'scripts',
  'npm',
  'publish-npm-packages-commit.mts',
)

describe('registry package identity', () => {
  test('the derived registry package name is the one on disk', () => {
    const registryPackage = packageData({
      name: requirePackageJson(REGISTRY_PKG_PATH).name,
      path: REGISTRY_PKG_PATH,
    })
    expect(registryPackage.name).toBe('@socketsecurity/registry')
    expect(registryPackage.printName).toBe('@socketsecurity/registry')
  })

  test('no hardcoded registry name can drift out from under the branches', () => {
    const source = readFileSync(COMMIT_MODULE_PATH, 'utf8')
    expect(source).not.toContain('@socketsecurity/registry-stable')
    expect(source).toContain('pkg.name === registryPackage.name')
  })
})

describe('requirePackageJson', () => {
  test('reads name + version off a real manifest', () => {
    const pkg = requirePackageJson(REGISTRY_PKG_PATH)
    expect(pkg.name).toBe('@socketsecurity/registry')
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/)
  })

  test('throws with a Where + Fix when the manifest omits a version', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'publish-commit-'))
    try {
      writeFileSync(
        path.join(dir, 'package.json'),
        `${JSON.stringify({ name: 'versionless' })}\n`,
      )
      expect(() => requirePackageJson(dir)).toThrow(
        /missing name\/version[\s\S]*Where:[\s\S]*Fix:/,
      )
    } finally {
      safeDeleteSync(dir)
    }
  })
})
