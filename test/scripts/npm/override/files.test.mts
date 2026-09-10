import { promises as fs } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import { writeOverrideFiles } from '../../../../scripts/repo/npm/override/files.mts'
import * as templates from '../../../../scripts/repo/util/templates.mts'

afterEach(() => vi.restoreAllMocks())

it('stops before package metadata changes when copying the template fails', async () => {
  const failure = new Error('Fixture copy failure')
  vi.spyOn(fs, 'cp').mockRejectedValue(failure)
  const packageAction = vi.spyOn(templates, 'getPackageJsonAction')
  await expect(
    writeOverrideFiles({
      templatePkgPath: '/fixture/template',
      pkgPath: '/fixture/package',
      templateChoice: 'cjs',
      nodeRange: undefined,
      tsRefs: [],
      licenseContents: [],
      nmPkgJson: { name: 'example-module', version: '1.0.0' },
    }),
  ).rejects.toBe(failure)
  expect(packageAction).not.toHaveBeenCalled()
})
