#!/usr/bin/env node
'use strict'

const path = require('node:path')

const fs = require('fs-extra')
const spawn = require('@npmcli/promise-spawn')
const which = require('which')
const { NODE_MODULES, PACKAGE_LOCK, PACKAGE_JSON } = require('./constants')
const { normalizePackageJson } = require('./utils/packages')

const rootPath = path.resolve(__dirname, '..')
const rootPkgLockPath = path.join(rootPath, PACKAGE_LOCK)
const rootNmPath = path.join(rootPath, NODE_MODULES)
const yarnPkgExtsPath = path.join(rootNmPath, '@yarnpkg/extensions')
const yarnPkgExtsJsonPath = path.join(yarnPkgExtsPath, PACKAGE_JSON)
const npmExecPath = which.sync('npm')

async function modifyRootPkgLock() {
  if (fs.existsSync(rootPkgLockPath)) {
    const rootPkgLockJson = await fs.readJson(rootPkgLockPath, 'utf8')
    // The @yarnpkg/extensions package is a zero dependency package, however it
    // includes @yarnpkg/core as peer dependency which npm happily installs as a
    // direct dependency. Later when check:tsc is run it will fail with errors
    // within the @types/emscripten package which is a transitive dependency of
    // @yarnpkg/core. We avoid this by removing the offending peerDependencies from
    // @yarnpkg/extensions and the package-lock.json file.
    const lockEntry =
      rootPkgLockJson.packages?.['node_modules/@yarnpkg/extensions']
    if (lockEntry?.peerDependencies) {
      // Properties with undefined values are omitted when saved as JSON.
      lockEntry.peerDependencies = undefined
      //await fs.writeJson(rootPkgLockPath, pkgLockJson, { spaces: 2 })
      return true
    }
  }
  return false
}

async function modifyYarnpkgExtsPkgJson() {
  if (fs.existsSync(yarnPkgExtsJsonPath)) {
    // Load, normalize, and re-save node_modules/@yarnpkg/extensions/package.json
    // Normalization applies packageExtensions to fix @yarnpkg/extensions's package.json.
    const yarnPkgExtsJsonRaw = await fs.readJson(yarnPkgExtsJsonPath)
    if (yarnPkgExtsJsonRaw.peerDependencies) {
      await fs.writeJson(
        yarnPkgExtsJsonPath,
        normalizePackageJson(yarnPkgExtsJsonRaw),
        { spaces: 2 }
      )
      return true
    }
  }
  return false
}

;(async () => {
  if ((await modifyRootPkgLock()) || (await modifyYarnpkgExtsPkgJson())) {
    // Reinstall packages with the updated package-lock.json. (should be quick)
    await spawn(npmExecPath, ['install'], {
      cwd: rootPath,
      stdio: 'inherit'
    })
  }
})()
