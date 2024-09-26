'use strict'

const path = require('node:path')

const fs = require('fs-extra')

const {
  README_MD,
  npmPackageNames,
  npmPackagesPath
} = require('@socketregistry/scripts/constants')
const { getReadmeAction } = require('@socketregistry/scripts/utils/templates')

;(async () => {
  await Promise.all(
    npmPackageNames.map(async pkgName => {
      const pkgPath = path.join(npmPackagesPath, pkgName)
      const readmePath = path.join(pkgPath, README_MD)
      const { 1: data } = await getReadmeAction(pkgPath)
      return fs.writeFile(readmePath, data.readme, 'utf8')
    })
  )
})()
