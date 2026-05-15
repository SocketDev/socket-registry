/** @fileoverview Update and validate package.json files for all npm packages. */

import path from 'node:path'
import { isDebug } from '@socketsecurity/lib-stable/debug'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger'
import {
  createPackageJson,
  getSubpaths,
  isSubpathExports,
  readPackageJson,
  resolvePackageJsonEntryExports,
} from '@socketsecurity/lib-stable/packages'

const logger = getDefaultLogger()
import { trimLeadingDotSlash } from '@socketsecurity/lib-stable/paths/normalize'
import { pluralize } from '@socketsecurity/lib-stable/words'
import fastGlob from 'fast-glob'

import { getNpmPackageNames } from '../constants/testing.mts'
import {
  NPM_PACKAGES_PATH,
  PACKAGE_JSON,
  SOCKET_REGISTRY_SCOPE,
} from '../constants/paths.mts'

/**
 * Update package.json files and validate subpath exports.
 */
async function main(): Promise<void> {
  const useDebug = isDebug()
  const warnings = []
  await Promise.allSettled(
    getNpmPackageNames().map(async sockRegPkgName => {
      const pkgPath = path.join(NPM_PACKAGES_PATH, sockRegPkgName)
      const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
      const editablePkgJson = await readPackageJson(pkgJsonPath, {
        editable: true,
        normalize: true,
      })
      const directory = `packages/npm/${sockRegPkgName}`
      const entryExports = resolvePackageJsonEntryExports(
        editablePkgJson.content.exports,
      )
      if (isSubpathExports(entryExports)) {
        const fullName = `${SOCKET_REGISTRY_SCOPE}/${sockRegPkgName}`
        const availableFiles = await fastGlob.glob(
          ['**/*.{[cm],}js', '**/*.d.{[cm],}ts', '**/*.json'],
          {
            ignore: ['**/overrides/*', '**/shared.{js,d.ts}'],
            cwd: pkgPath,
          },
        )
        const subpaths = getSubpaths(entryExports).map(trimLeadingDotSlash)
        for (let i = 0, { length } = subpaths; i < length; i += 1) {
          const subpath = subpaths[i]
          if (!availableFiles.includes(subpath)) {
            const warning = `${fullName}: ${subpath} subpath file does not exist`
            warnings.push(warning)
            if (useDebug) {
              logger.warn(warning)
            }
          }
        }
        for (let i = 0, { length } = availableFiles; i < length; i += 1) {
          const relPath = availableFiles[i]
          if (!relPath.startsWith('package/') && !subpaths.includes(relPath)) {
            const warning = `${fullName}: ${relPath} missing from subpath exports`
            warnings.push(warning)
            if (useDebug) {
              logger.warn(warning)
            }
          }
        }
      }
      editablePkgJson.update(
        createPackageJson(editablePkgJson.content.name, directory, {
          ...editablePkgJson.content,
        }),
      )
      await editablePkgJson.save()
    }),
  )

  if (!useDebug && warnings.length) {
    logger.warn(
      `Found ${warnings.length} subpath export ${pluralize('warning', { count: warnings.length })} (use DEBUG=* to see details)`,
    )
  }
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
