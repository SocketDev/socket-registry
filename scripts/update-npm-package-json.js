'use strict'

const path = require('node:path')

const { glob: tinyGlob } = require('tinyglobby')

const constants = require('@socketregistry/scripts/constants')
const {
  createPackageJson,
  getSubpaths,
  isSubpathExports,
  readPackageJson,
  resolvePackageJsonEntryExports
} = require('@socketsecurity/registry/lib/packages')
const { trimLeadingDotSlash } = require('@socketsecurity/registry/lib/path')

const { PACKAGE_JSON, SOCKET_REGISTRY_SCOPE, npmPackagesPath } = constants

void (async () => {
  await Promise.all(
    // Lazily access constants.npmPackageNames.
    constants.npmPackageNames.map(async sockRegPkgName => {
      const pkgPath = path.join(npmPackagesPath, sockRegPkgName)
      const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
      const editablePkgJson = await readPackageJson(pkgJsonPath, {
        editable: true
      })
      const directory = `packages/npm/${sockRegPkgName}`
      const entryExports = resolvePackageJsonEntryExports(
        editablePkgJson.content.exports
      )
      if (isSubpathExports(entryExports)) {
        const fullName = `${SOCKET_REGISTRY_SCOPE}/${sockRegPkgName}`
        const availableFiles = await tinyGlob(
          ['**/*.{[cm],}js', '**/*.d.{[cm],}ts', '**/*.json'],
          {
            ignore: ['**/overrides/*', '**/shared.{js,d.ts}'],
            cwd: pkgPath
          }
        )
        const subpaths = getSubpaths(entryExports).map(trimLeadingDotSlash)
        for (const subpath of subpaths) {
          if (!availableFiles.includes(subpath)) {
            console.warn(`${fullName}: ${subpath} subpath file does not exist`)
          }
        }
        for (const relPath of availableFiles) {
          if (!relPath.startsWith(`package/`) && !subpaths.includes(relPath)) {
            console.warn(`${fullName}: ${relPath} missing from subpath exports`)
          }
        }
      }
      editablePkgJson.update(
        createPackageJson(editablePkgJson.content.name, directory, {
          ...editablePkgJson.content
        })
      )
      await editablePkgJson.save()
    })
  )
})()
