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

const { PACKAGE_JSON, npmPackagesPath } = constants

void (async () => {
  await Promise.all(
    // Lazily access constants.npmPackageNames.
    constants.npmPackageNames.map(async regPkgName => {
      const pkgPath = path.join(npmPackagesPath, regPkgName)
      const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
      const editablePkgJson = await readPackageJson(pkgJsonPath, {
        editable: true
      })
      const directory = `packages/npm/${regPkgName}`
      const entryExports = resolvePackageJsonEntryExports(
        editablePkgJson.content.exports
      )
      if (isSubpathExports(entryExports)) {
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
            console.warn(
              `${regPkgName}: ${subpath} subpath file does not exist`
            )
          }
        }
        for (const relPath of availableFiles) {
          if (!subpaths.includes(relPath)) {
            console.warn(
              `${regPkgName}: ${relPath} missing from subpath exports`
            )
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
