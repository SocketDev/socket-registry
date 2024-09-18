'use strict'

const path = require('node:path')

const fs = require('fs-extra')

const {
  PACKAGE_JSON,
  npmPackageNames,
  npmPackagesPath
} = require('@socketregistry/scripts/constants')
const { readPackageJson } = require('@socketregistry/scripts/utils/fs')
const { createPackageJson } = require('@socketregistry/scripts/utils/packages')

;(async () => {
  for (const pkgName of npmPackageNames) {
    const pkgJsonPath = path.join(npmPackagesPath, pkgName, PACKAGE_JSON)
    const pkgJson = await readPackageJson(pkgJsonPath)
    const { name } = pkgJson
    const directory = `packages/npm/${pkgName}`
    const output = createPackageJson(name, directory, {
      ...pkgJson
    })
    await fs.writeJson(pkgJsonPath, output, { spaces: 2 })
  }
})()
