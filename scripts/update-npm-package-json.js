'use strict'

const path = require('node:path')

const fs = require('fs-extra')
const { glob: tinyGlob } = require('tinyglobby')

const { PACKAGE_JSON } = require('@socketregistry/scripts/constants')
const { readPackageJson } = require('@socketregistry/scripts/utils/fs')
const { createPackageJson } = require('@socketregistry/scripts/utils/packages')
const { trimTrailingSlash } = require('@socketregistry/scripts/utils/path')
const { localCompare } = require('@socketregistry/scripts/utils/sorts')

const rootPath = path.resolve(__dirname, '..')
const npmPackagesPath = path.join(rootPath, 'packages/npm')

;(async () => {
  const packageNames = (
    await tinyGlob(['*/'], {
      cwd: npmPackagesPath,
      onlyDirectories: true,
      expandDirectories: false
    })
  )
    .map(trimTrailingSlash)
    .sort(localCompare)
  for (const pkgName of packageNames) {
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
