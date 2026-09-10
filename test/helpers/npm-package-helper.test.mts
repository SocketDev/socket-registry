import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'

const fixture = vi.hoisted(() => ({ root: '' }))
vi.mock(import('../../scripts/repo/constants/paths.mts'), () => ({
  NPM: 'npm',
  get NPM_PACKAGES_PATH() {
    return fixture.root
  },
}))

beforeEach(() => {
  fixture.root = mkdtempSync(path.join(os.tmpdir(), 'registry-test-loader-'))
  vi.stubEnv('PRE_COMMIT', '')
  vi.stubEnv('FORCE_TEST', '')
  vi.resetModules()
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await safeDelete(fixture.root)
})

function writeOverride(name: string, files: Record<string, string>): void {
  const directory = path.join(fixture.root, name)
  mkdirSync(directory)
  for (const [filename, content] of Object.entries(files)) {
    writeFileSync(path.join(directory, filename), content)
  }
}

test('missing overrides fail instead of silently skipping', async () => {
  const { setupNpmPackageTest } = await import('../util/npm-package-helper.mts')
  expect(() =>
    setupNpmPackageTest(import.meta.url, { package: 'example-missing' }),
  ).toThrow()
})

test('broken primary overrides fail instead of silently skipping', async () => {
  writeOverride('example-broken', {
    'index.js': "throw new Error('example load failure')",
  })
  const { setupNpmPackageTest } = await import('../util/npm-package-helper.mts')
  expect(() =>
    setupNpmPackageTest(import.meta.url, { package: 'example-broken' }),
  ).toThrow()
})

test('broken sibling lanes fail instead of silently losing their coverage', async () => {
  writeOverride('example-sibling', {
    'package.json': JSON.stringify({
      exports: { node: './index.cjs', default: './index.js' },
    }),
    'index.cjs': 'module.exports = () => 42',
    'index.js': "throw new Error('example sibling failure')",
  })
  const { setupNpmPackageTest } = await import('../util/npm-package-helper.mts')
  expect(() =>
    setupNpmPackageTest(import.meta.url, { package: 'example-sibling' }),
  ).toThrow()
})

test('working overrides execute the current fixture module', async () => {
  writeOverride('example-working', { 'index.js': 'module.exports = () => 42' })
  const { setupNpmPackageTest } = await import('../util/npm-package-helper.mts')
  const loaded = setupNpmPackageTest(import.meta.url, {
    package: 'example-working',
  })
  expect(loaded.skip).toBe(false)
  expect(loaded.module()).toBe(42)
})
