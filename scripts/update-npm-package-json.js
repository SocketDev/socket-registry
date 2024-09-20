'use strict'

const path = require('node:path')

const {
  PACKAGE_JSON,
  npmPackageNames,
  npmPackagesPath
} = require('@socketregistry/scripts/constants')
const { readPackageJson } = require('@socketregistry/scripts/utils/fs')
const { createPackageJson } = require('@socketregistry/scripts/utils/packages')

;(async () => {
  await Promise.all(
    npmPackageNames.map(async pkgName => {
      const pkgJsonPath = path.join(npmPackagesPath, pkgName, PACKAGE_JSON)
      const editablePkgJson = await readPackageJson(pkgJsonPath, {
        editable: true
      })
      const directory = `packages/npm/${pkgName}`
      editablePkgJson.update(
        createPackageJson(editablePkgJson.content.name, directory, {
          ...editablePkgJson.content
        })
      )
      await editablePkgJson.save()
    })
  )
})()
