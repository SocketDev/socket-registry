import { createRequire } from 'node:module'
import path from 'node:path'

import constants from './constants.mjs'

const require = createRequire(import.meta.url)
const { glob } = require('fast-glob')
const { logger } = require('@socketsecurity/registry/lib/logger')
const {
  createPackageJson,
  getSubpaths,
  isSubpathExports,
  readPackageJson,
  resolvePackageJsonEntryExports,
} = require('@socketsecurity/registry/lib/packages')
const { trimLeadingDotSlash } = require('@socketsecurity/registry/lib/path')

const { PACKAGE_JSON, SOCKET_REGISTRY_SCOPE } = constants

void (async () => {
  await Promise.all(
    constants.npmPackageNames.map(async sockRegPkgName => {
      const pkgPath = path.join(constants.npmPackagesPath, sockRegPkgName)
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
        const availableFiles = await glob(
          ['**/*.{[cm],}js', '**/*.d.{[cm],}ts', '**/*.json'],
          {
            ignore: ['**/overrides/*', '**/shared.{js,d.ts}'],
            cwd: pkgPath,
          },
        )
        const subpaths = getSubpaths(entryExports).map(trimLeadingDotSlash)
        for (const subpath of subpaths) {
          if (!availableFiles.includes(subpath)) {
            logger.warn(`${fullName}: ${subpath} subpath file does not exist`)
          }
        }
        for (const relPath of availableFiles) {
          if (!relPath.startsWith(`package/`) && !subpaths.includes(relPath)) {
            logger.warn(`${fullName}: ${relPath} missing from subpath exports`)
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
})()
