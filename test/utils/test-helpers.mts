/**
 * @fileoverview Shared test utilities for npm package testing.
 * Provides helpers for setting up isolated test environments.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'

import {
  isolatePackage as registryIsolatePackage,
  readPackageJson,
  resolveOriginalPackageName,
} from '@socketsecurity/lib/packages'

import {
  NPM_PACKAGES_PATH,
  TEST_NPM_PKG_JSON_PATH,
} from '../../scripts/constants/paths.mts'
import { cleanTestScript } from './script-cleaning.mts'
import { testRunners } from './test-runners.mts'

const npmPackagesPath = NPM_PACKAGES_PATH
const testNpmPkgJsonPath = TEST_NPM_PKG_JSON_PATH

interface IsolatePackageOptions {
  imports?: Record<string, string>
}

interface IsolatePackageResult {
  exports?: Record<string, unknown> | undefined
  tmpdir: string
}

interface SetupMultiEntryTestResult {
  modules: unknown[]
  tmpdir: string
}

/**
 * Isolates a package in a temporary test environment.
 */
export async function isolatePackage(
  packageSpec: string,
  options: IsolatePackageOptions = {},
): Promise<IsolatePackageResult> {
  const { imports } = { __proto__: null, ...options } as IsolatePackageOptions

  let resolvedSpec = packageSpec
  let sourcePath: string | undefined
  let hasSourcePath = false

  if (
    packageSpec.startsWith('@socketregistry/') &&
    !packageSpec.includes('@', 1)
  ) {
    const socketPkgName = packageSpec
    sourcePath = path.join(npmPackagesPath, socketPkgName)

    if (!existsSync(sourcePath)) {
      throw new Error(`No Socket override found for ${socketPkgName}`)
    }

    const packageName = resolveOriginalPackageName(socketPkgName)

    const testPkgJson = await readPackageJson(testNpmPkgJsonPath, {
      normalize: true,
    })
    const spec = testPkgJson?.devDependencies?.[packageName]

    if (!spec) {
      throw new Error(`${packageName} not in devDependencies`)
    }

    resolvedSpec = `${packageName}@${spec}`
    hasSourcePath = true
  }

  return await registryIsolatePackage(resolvedSpec, {
    imports,
    onPackageJson: async (pkgJson: any) => {
      if (hasSourcePath) {
        const originalScripts = pkgJson.scripts

        if (originalScripts) {
          pkgJson.scripts = pkgJson.scripts || {}

          const additionalTestRunners = [
            ...testRunners,
            'test:stock',
            'test:all',
          ]
          let actualTestScript: string | undefined = additionalTestRunners.find(
            (runner: string) => originalScripts[runner],
          )

          if (!actualTestScript && originalScripts['test']) {
            const testMatch = originalScripts['test'].match(/npm run ([-:\w]+)/)
            if (testMatch && originalScripts[testMatch[1]]) {
              actualTestScript = testMatch[1]
            }
          }

          if (actualTestScript && originalScripts[actualTestScript]) {
            pkgJson.scripts['test'] = cleanTestScript(
              originalScripts[actualTestScript],
            )
            if (actualTestScript !== 'test') {
              pkgJson.scripts[actualTestScript] = cleanTestScript(
                originalScripts[actualTestScript],
              )
            }
          } else if (originalScripts['test']) {
            pkgJson.scripts['test'] = cleanTestScript(originalScripts['test'])
          }

          for (const { 0: key, 1: value } of Object.entries(originalScripts)) {
            if (
              (key.startsWith('test:') || key.startsWith('tests')) &&
              !pkgJson.scripts[key]
            ) {
              pkgJson.scripts[key] = cleanTestScript(value as string)
            }
          }
        }
      }

      return pkgJson
    },
    sourcePath,
  })
}

/**
 * Sets up a test environment for packages with multiple entry points.
 */
export async function setupMultiEntryTest(
  packageSpec: string,
  entryPoints: string[] = ['index.js'],
): Promise<SetupMultiEntryTestResult> {
  const imports: Record<string, string> = Object.create(null)
  for (const { 0: index, 1: entry } of Object.entries(entryPoints)) {
    imports[`entry_${index}`] = entry
  }

  const result = await isolatePackage(packageSpec, { imports })

  const modules: unknown[] = []
  for (const { 0: index } of Object.entries(entryPoints)) {
    modules.push(result.exports?.[`entry_${index}`])
  }

  return {
    modules,
    tmpdir: result.tmpdir,
  }
}
