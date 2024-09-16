'use strict'

const path = require('node:path')

const fs = require('fs-extra')

const rootPath = path.resolve(__dirname, '..')
const packageLockPath = path.join(rootPath, 'package-lock.json')

;(async () => {
  const pkgLockJson = await fs.readJson(packageLockPath, 'utf8')
  // The @yarnpkg/extensions package incorrectly includes @yarnpkg/core as a
  // peer dependency which is treated as a dependency by npm and causes tsc to fail.
  const yarnpkgExtensions = pkgLockJson.packages?.['node_modules/@yarnpkg/extensions']
  if (yarnpkgExtensions) {
    yarnpkgExtensions.peerDependencies = undefined
  }
  await fs.writeJson(packageLockPath, pkgLockJson, { spaces: 2 })
})()
