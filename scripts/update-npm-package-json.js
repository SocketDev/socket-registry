'use strict'

const path = require('node:path')

const constants = require('@socketregistry/scripts/constants')
const { PACKAGE_JSON, npmPackagesPath } = constants
const {
  createPackageJson,
  readPackageJson
} = require('@socketregistry/scripts/utils/packages')

;(async () => {
  await Promise.all(
    // Lazily access constants.npmPackageNames.
    constants.npmPackageNames.map(async regPkgName => {
      const pkgPath = path.join(npmPackagesPath, regPkgName)
      const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
      const editablePkgJson = await readPackageJson(pkgJsonPath, {
        editable: true
      })
      const directory = `packages/npm/${regPkgName}`
      editablePkgJson.update(
        createPackageJson(editablePkgJson.content.name, directory, {
          ...editablePkgJson.content
        })
      )
      await editablePkgJson.save()
    })
  )
})()
